const VEDirect = require('./VEDirect');

module.exports = function (RED) {
  function VEDirectNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // Initial port setup
    let veDirectInstance = new VEDirect(config.port);

    // Listen for data events from VE.Direct and forward them as Node-RED messages
    veDirectInstance.on("data", (data) => {
      node.send({ payload: data });
    });

    // Handle dynamic port changes
    node.on("input", (msg) => {
      if (msg.topic === "changePort" && msg.payload.port) {
        let newPort = msg.payload.port;
        
        // Check if the port is actually changing to avoid redundant reinitialization
        if (newPort !== config.port) {
          config.port = newPort; // Update the configuration port

          // Close the existing port connection before reopening on a new port
          if (veDirectInstance.serial.isOpen) {
            veDirectInstance.serial.close((err) => {
              if (err) {
                node.error(`Error closing serial port: ${err.message}`);
              } else {
                node.log(`Serial port closed. Reopening on ${newPort}`);
                veDirectInstance = new VEDirect(newPort); // Reinitialize with new port

                // Rebind the data event to send data over Node-RED messages
                veDirectInstance.on("data", (data) => {
                  node.send({ payload: data });
                });
              }
            });
          }
        } else {
          node.warn(`Port ${newPort} is already in use.`);
        }
      }
    });

    // Clean up when node is closed
    node.on("close", () => {
      if (veDirectInstance.serial.isOpen) {
        veDirectInstance.serial.close();
      }
    });
  }

  RED.nodes.registerType("vedirect", VEDirectNode);
};
