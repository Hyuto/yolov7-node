const socket = io();
let streaming = false;

fetch(window.location.origin + "/api")
  .then((response) => response.json())
  .then((data) => console.log(data));

const camera = document.getElementById("cameraInput"); // video is the id of video tag
const video = document.getElementById("videoInput"); // video is the id of video tag
const canvas = document.getElementById("canvas");
const container = document.getElementById("videoContainer");

video.onended = () => {
  closeVid();
};

camera.onended = () => {
  closeVid();
};

const detect = (src) => {
  const cap = new cv.VideoCapture(src);
  const mat = new cv.Mat(src.height, src.width, cv.CV_8UC4);
  const matC3 = new cv.Mat(320, 320, cv.CV_8UC3); // new image matrix (640 x 640)
  const FPS = 30;

  const processVideo = () => {
    try {
      if (!streaming) {
        // clean and stop.
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas
        mat.delete();
        matC3.delete();
        return;
      }
      const begin = Date.now();
      // start processing.
      cap.read(mat);
      cv.cvtColor(mat, matC3, cv.COLOR_RGBA2BGR); // RGBA to BGR
      const input = cv.blobFromImage(
        matC3,
        1 / 255.0,
        new cv.Size(320, 320),
        new cv.Scalar(0, 0, 0),
        true,
        false
      ); // preprocessing image matrix
      const array = input.data32F.slice();
      socket.emit("videoframe", array);
      input.delete();

      // schedule the next one.
      let delay = 1000 / FPS - (Date.now() - begin);
      setTimeout(processVideo, delay);
    } catch (err) {
      console.error(err);
    }
  };

  setTimeout(processVideo, 0);
};

const openCamera = () => {
  // Connection opened
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then(function (stream) {
      camera.srcObject = stream;
      container.style.display = "block";
      camera.style.display = "block";
      camera.play();
      streaming = true;
      detect(camera);

      socket.emit("streaming", streaming);
      socket.on("videoframe", function (boxes) {
        renderBoxes(boxes, labels);
      });
    })
    .catch(function (err) {
      console.log("Can't open camera: " + err);
    });
};

const inputVideo = document.getElementById("inputVideo");
inputVideo.onchange = (e) => {
  const url = URL.createObjectURL(e.target.files[0]);
  video.src = url;
  video.onloadedmetadata = () => {
    container.style.display = "block";
    video.style.display = "block";
    video.play();
    streaming = true;
    detect(video);

    socket.emit("streaming", streaming);
    socket.on("videoframe", function (boxes) {
      renderBoxes(boxes, labels);
    });
  };
};

const closeVid = () => {
  if (camera.srcObject) {
    camera.srcObject.getTracks().forEach(function (track) {
      track.stop();
    });
    camera.style.display = "none";
    camera.srcObject = null;
  } else if (video.src !== "") {
    inputVideo.value = "";
    const url = video.src;
    video.src = "";
    URL.revokeObjectURL(url);
    video.style.display = "none";
  }
  streaming = false;
  socket.emit("streaming", streaming);
  container.style.display = "none";
};

const renderBoxes = (boxes, labels) => {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas

  // font configs
  const font = "18px sans-serif";
  ctx.font = font;
  ctx.textBaseline = "top";

  boxes.forEach((box) => {
    const klass = labels[box.classId];
    const score = (box.probability * 100).toFixed(1);
    const [x1, y1, width, height] = box.bounding;

    // Draw the bounding box.
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, width, height);

    // Draw the label background.
    ctx.fillStyle = "#00FF00";
    const textWidth = ctx.measureText(klass + " - " + score + "%").width;
    const textHeight = parseInt(font, 10); // base 10
    ctx.fillRect(x1 - 1, y1 - (textHeight + 2), textWidth + 2, textHeight + 2);

    // Draw labels
    ctx.fillStyle = "#ffffff";
    ctx.fillText(klass + " - " + score + "%", x1 - 1, y1 - (textHeight + 2));
  });
};

const labels = [
  "person",
  "bicycle",
  "car",
  "motorcycle",
  "airplane",
  "bus",
  "train",
  "truck",
  "boat",
  "traffic light",
  "fire hydrant",
  "stop sign",
  "parking meter",
  "bench",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "backpack",
  "umbrella",
  "handbag",
  "tie",
  "suitcase",
  "frisbee",
  "skis",
  "snowboard",
  "sports ball",
  "kite",
  "baseball bat",
  "baseball glove",
  "skateboard",
  "surfboard",
  "tennis racket",
  "bottle",
  "wine glass",
  "cup",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  "chair",
  "couch",
  "potted plant",
  "bed",
  "dining table",
  "toilet",
  "tv",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cell phone",
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "book",
  "clock",
  "vase",
  "scissors",
  "teddy bear",
  "hair drier",
  "toothbrush",
];
