const { KNXTunnelSocket, DataPoints, KNXAddress, NPDU, KNXClient } = require("knx-ip");
const log = require("@node-red/util").log;

/**
 * @callback BusEventCallBack
 * @param {string} src
 * @param {string} dst
 * @param {Buffer} data
 */

/**
 * 
 * @typedef {object} BusEventListener
 * @property {string} knxid
 * @property {cb} BusEventCallBack
 */


/**
 * 
 * @param {RED} RED 
 */
module.exports = function (RED) {
  function KNXGatewayNode(config) {
    /**
     * @type {Array<{BusEventListener>}
     */
    const busEventListeners = [];
    try {
      RED.nodes.createNode(this, config);

      this.host = config.host;
      this.port = config.port;
      this.name = config.name;
      this.knxid = config.knxid;

      var node = this;
      node.shutdown = false;

      /**
       * 
       * @param {KNXAddress} srcAddress 
       * @param {KNXAddress} dstAddress 
       * @param {NPDU} npdu 
       */
      function handleBusEvent(srcAddress, dstAddress, npdu) {
        const src = srcAddress.toString();
        const dst = dstAddress.toString();
        const buffer = npdu.dataValue;
        //node.debug(`${src} -> ${dst} : ${buffer.toString('hex')}`);
        node.emit('bus', { src, dst, data: buffer});
        busEventListeners.forEach(listener => {
          if (listener.knxid === dst ) {
            node.log(`listener match for ${dst}`)
            listener.cb(src,dst, buffer);
          }
        });
      };

      /**
       * 
       * @param {string} knxid 
       * @param {BusEventCallBack} cb 
       */
      node.registerBusEvents = (knxid, cb) => {
        busEventListeners.push({ knxid, cb });
      }

      node.connect = async function connect() {
        node.log(`Connecting to ${this.host}:${this.port}`);
        if (node.client) {
          delete node.client;
        }
        const client = new KNXTunnelSocket(node.knxid);
        node.client = client;
        client.on(KNXClient.KNXClientEvents.error, e => node.emit('error', e));
        client.on(KNXClient.KNXClientEvents.disconnected, () => { node.emit('close') });
        client.connectAsync(this.host, this.port)
          .then(() => node.log(`Connected through channel id ${client.channelID}`))
          .then(() => {
            node.log("Starting bus monitoring");
            client.on("indication", handleBusEvent);
            client.monitorBus();
            this.emit("connected", client);
          })
          .catch(e => node.warn(e));
      }

      node.connect().catch(e => node.warn(e));
    } catch (e) {
      node.warn(e);
    }
  }
  RED.httpAdmin.get('/knx/discover/:ip/:knxid', RED.auth.needsPermission('knx.read'), (req, res) => {
    const knxClient = new KNXTunnelSocket(req.params.knxid);
    node.log("Start Auto Discovery", req.params.ip, req.params.knxid);
    const timeout = setTimeout(() => res.status(500).send("No Response"), 60000);
    knxClient.once(KNXTunnelSocket.KNXTunnelSocketEvents.error, err => {
      clearTimeout(timeout);
      if (err) {
        node.warn(err);
        res.status(500).send(e.message);
      }
    });

    knxClient.once(KNXTunnelSocket.KNXTunnelSocketEvents.discover, info => {
      clearTimeout(timeout);
      node.log("Discovery", info)
      res.status(200).send(info);
    });
    knxClient.startDiscovery(req.params.ip);
  });
  RED.nodes.registerType("knx-gateway", KNXGatewayNode);
}
