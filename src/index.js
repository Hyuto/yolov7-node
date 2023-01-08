const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const ort = require("onnxruntime-node");

// model configs
const modelInfo = {
  name: "yolov7-tiny.onnx",
  inputShape: [1, 3, 640, 640],
};

let session; // onnxruntime session
(async () => {
  session = await ort.InferenceSession.create(path.join(__dirname, modelInfo.name)); // load model

  // warmup model
  const tensor = new ort.Tensor(
    "float32",
    new Float32Array(modelInfo.inputShape.reduce((a, b) => a * b)),
    modelInfo.inputShape
  );
  await session.run({ images: tensor });
  console.log(session);
})();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e8, // change socket io max transfer buffer size
  pingTimeout: 60000,
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const detect = async (frame, xRatio, yRatio) => {
  const input = new Float32Array(frame.buffer);
  const tensor = new ort.Tensor("float32", input, modelInfo.inputShape); // to ort.Tensor
  const { output } = await session.run({ images: tensor }); // run session and get output layer
  const boxes = [];

  // looping through output
  for (let r = 0; r < output.size; r += output.dims[1]) {
    const data = output.data.slice(r, r + output.dims[1]); // get rows
    const [x0, y0, x1, y1, classId, score] = data.slice(1);
    const w = x1 - x0,
      h = y1 - y0;
    boxes.push({
      classId: classId,
      probability: score,
      bounding: [x0 * xRatio, y0 * yRatio, w * xRatio, h * yRatio],
    });
  }
  return boxes;
};

io.on("connection", (socket) => {
  socket.emit("model-env", modelInfo); // send model information

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  // get image array from frontend and do detection
  socket.on("videoframe", async (frame, xRatio, yRatio, callback) => {
    const boxes = await detect(frame, xRatio, yRatio);
    callback(boxes); // send boxes to frontend
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:3000`);
});
