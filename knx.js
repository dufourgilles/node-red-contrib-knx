const {KNXTunnelSocket, KNXAddress, DataPoints} = require("knx-ip");
const { DataPoint, createDataPoint } = require("knx-ip/lib/DataPoints");

/**
 * @typedef NodeRedFunctionArgs
 * @type {object}
 * @property {number} type - argument type
 * @property {number|string} value
 */

module.exports = function (RED) {
    function KNXNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.config = config;
        /** @type {KNXTunnelSocket | null} */
        node.client = null;
        /** @type {DataPoint | null} */
        node.knxDataPoint = null;

        // Retrieve the config node
        this.knxGateway = RED.nodes.getNode(config.server);
        if (this.knxGateway) {
            const knxGateway = this.knxGateway;
            const groupid = node.config.knxid.replace(/\./g, '/');
            knxGateway.registerBusEvents(groupid, (src, dst, buffer) => {
                const msg = { payload: null};
                if (node.knxDataPoint) {                    
                    if (node.config.outputMode === 'value') {
                        msg.payload = node.knxDataPoint.type.decode(buffer);
                    } else if (node.config.outputMode === 'raw') {
                        msg.payload = buffer;
                    } else {
                        msg.payload = {
                            src,dst,buffer,value: node.knxDataPoint.type.decode(buffer)
                        }
                    }
                } else {
                    msg.payload = {src,dst,buffer}
                }
                node.log(`KNX: ${src} -> ${dst} : ${JSON.stringify(msg)}`);
                node.send(msg);
            });
            knxGateway.on('error', error => {
                node.status({ fill: 'red', shape: "dot", text: error.message });
                node.error(error);
            });
            knxGateway.on('connected', data => {
                node.status({ fill: 'green', shape: "dot", text: 'connected' });
                /**
                 * @type {KNXTunnelSocket}
                 */
                node.client = data;
                if (node.config.knxid && node.config.knxtype) {
                    try {
                        const datapointAddress =  KNXAddress.createFromString(node.config.knxid, KNXAddress.TYPE_GROUP);
                        node.knxDataPoint = createDataPoint(datapointAddress, node.config.knxtype);
                        node.knxDataPoint.bind(data);
                    } catch(e) {
                        knxGateway.emit('error', e);
                    }
                }
            });
            knxGateway.on("close", () => {
                node.knxDataPoint = null;
                node.status({ fill: 'red', shape: "dot", text: "not connected"});
            });
        } else {
            // No config node configured
        }
        node.on('input', async (msg, send, done) => {
            if (node.knxDataPoint == null) {
                return;
            }
            const payload = node.config.knxtype === 'switch' ? Number(msg.payload) : msg.payload;
            try {
                node.knxDataPoint.write(payload);
            } catch(e) {
                if (done) {
                    done(e);
                } else {
                    node.error(e.stack);
                }
                node.log(e);
            }
        });
    }
    RED.nodes.registerType("knx", KNXNode);
}
