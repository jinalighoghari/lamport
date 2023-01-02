const grpc = require("grpc");
const readline = require("readline");
// This uses proto.js
const protoLoader = require("@grpc/proto-loader");
const packageDef = protoLoader.loadSync("messages.proto", {});
// Load the package we defined in messages.proto
const grpcObejct = grpc.loadPackageDefinition(packageDef);
const lamportMessage = grpcObejct.lamportMessage;

// Define a grpc server
const server = new grpc.Server();
server.bind("0.0.0.0:40002", grpc.ServerCredentials.createInsecure());
server.addService(lamportMessage.message_service.service, {
  message_exchange: message_exchange,
});
server.start();

const globalProcessID = 2;
let local_clock = 0;
let clock_array = [];
let id = 1;

const all_processes = {
  process_1: new lamportMessage.message_service("localhost:40001", grpc.credentials.createInsecure()),
  process_3: new lamportMessage.message_service("localhost:40003", grpc.credentials.createInsecure()),
  process_4: new lamportMessage.message_service("localhost:40004", grpc.credentials.createInsecure()),
};

function updateLamportClock(timestamp) {
  // find the max time and add 1. Set this value as the new clock.
  local_clock = Math.max(timestamp, local_clock) + 1;
  clock_array.push(local_clock);
}

function send_message(process_object) {
  local_clock += 1;
  clock_array.push(local_clock);
  process_object.message_exchange({ id: id, message: "Greetings!", processID: globalProcessID, clock: local_clock }, (err, response) => {
    console.log("[Message Sent] The message sent is => " + JSON.stringify({ id: id, message: "Greetings!", processID: globalProcessID, clock: local_clock }));
    id += 1;
  });
}

function message_exchange(call, callback) {
  // Get timestamp from the connection1 and update the clock
  updateLamportClock(call.request.clock);

  console.log(`[Message Received] => Message: "${call.request.message}". Received from Process: "${call.request.processID}". clock: ${local_clock}`);

  // Close the connection, length of payload is set to null which means it will be auto calculated
  callback(null, { id: id, message: "Greetings!", processID: globalProcessID, clock: local_clock });
  id += 1;
}

// Create the first local event
local_clock += 1;
id += 1;
clock_array.push(local_clock);
console.log(`First local event created. clock: "${local_clock}"`);

const asyncReadLine = () => {
  const readinputLine = readline.createInterface({
    input: process.stdin,
  });

  return new Promise((resolve) => {
    readinputLine.prompt();
    readinputLine.on("line", (line) => {
      readinputLine.close();
      resolve(line);
    });
  });
};

const read_handler = async () => {
  console.log("\n1) Create local event\n2) Send Message\n3) Print all recorded clocks\nOption: ");
  const option = await asyncReadLine();
  if (option == 1) {
    local_clock += 1;
    id += 1;
    clock_array.push(local_clock);
    console.log(`Local event just advances the clock (simulates a local event in the process). clock: "${local_clock}"`);
  } else if (option == 2) {
    console.log("Which Process Number: ");
    const input_process = await asyncReadLine();
    send_message(all_processes[`process_${input_process}`], `Greetings from ${globalProcessID}}`);
  } else if (option == 3) {
    console.log("All clock values: ", clock_array.join(" "));
  }
  read_handler();
};

read_handler();
