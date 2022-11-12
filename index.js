var ort = require("onnxruntime-node");
var session;
(async () => {
  session = await ort.InferenceSession.create(__dirname + "/public/yolov7-tiny.onnx");

  // warmup model
  var tensor = new ort.Tensor("float32", new Float32Array(307200), [1, 3, 320, 320]);
  await session.run({ images: tensor });
  console.log(session);
})();

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  maxHttpBufferSize: 1e8, // change socket io max transfer buffer size
  pingTimeout: 60000,
});

app.use(express.static(__dirname + "/public"));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/api", function (req, res) {
  res.status(200).send({ Hello: "Welcome to the app" });
});

const detect = async (frame) => {
  var input = new Float32Array(frame.buffer);
  var tensor = new ort.Tensor("float32", input, [1, 3, 320, 320]); // to ort.Tensor
  var { output } = await session.run({ images: tensor }); // run session and get output layer
  var boxes = [];

  // looping through output
  for (let r = 0; r < output.size; r += output.dims[1]) {
    var data = output.data.slice(r, r + output.dims[1]); // get rows
    var [x0, y0, x1, y1, classId, score] = data.slice(1);
    var w = x1 - x0,
      h = y1 - y0;
    boxes.push({
      classId: classId,
      probability: score,
      bounding: [x0, y0, w, h],
    });
  }
  return boxes;
};

io.on("connection", (socket) => {
  let streaming = false;

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("streaming", (state) => {
    streaming = state;
  });

  socket.on("videoframe", (frame) => {
    if (streaming)
      detect(frame).then((boxes) => {
        console.log(boxes);
        socket.emit("videoframe", boxes);
      });
  });
});

server.listen(3000, () => {
  console.log(`Example app listening at http://localhost:3000`);
});
