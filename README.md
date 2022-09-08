# node-red-contrib-knx
Simple KNX client node for home automation supporting KNX.

## install
Inside your node-red directory, install the NPM node-red-contrib-knx package.

```
npm install node-red-contrib-knx
```

##  knx-gateway node 
You need to define at least one KNX Gateway. The KNX Gateway is your home component providing access to your KNX network via IP protocol. 
A single KNX Gateway can be used for multiple KNX Object.


## KNX node
Each KNX node is associated with a previously configured knx-gateway node.
Your KNX node represent one object (lamp, heater, blind, ...) of your knx network.
To identify the object to monitor or control, specify its knx group id.
A KNX Object type is also required to properly parse the received data from KNX gateway and to correctly format control messages.

### Input Pin
The input pin of the node takes different type of message payloads.
Each object type will have its own format.
For example, a lamp or binary controller, takes a number 0 or 1

### Output Pin
The data format of the output pin can be configured:
- plain: msg.payload contains the plain value from the Ember+ object
- contents: msg.payload.contents contains the contents Ember+ object from the underlying node-emberplus client 
- full: msg.payload.full contains the full Ember+ object from the underlying node-emberplus (including the device path)
- json: msg.payload contains a JSON object representing the ember element.


## To Be Done

