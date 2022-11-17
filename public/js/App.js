import { detect } from "./detect.js";

const camera = document.getElementById("cameraInput");
const video = document.getElementById("videoInput");
const canvas = document.getElementById("canvas");
const container = document.getElementById("videoContainer");

const socket = io(); // connect to the server using socket io
// get model information
socket.on("model-env", (data) => {
  document.getElementById("modelName").innerText = data.name;
  window.modelInputShape = data.inputShape; // global input shape state

  // Set canvas shape
  const [imageWidth, imageHeight] = data.inputShape.slice(2, 4);
  canvas.width = imageWidth;
  canvas.height = imageHeight;
});
window.streaming = null; // global streaming state

video.onloadedmetadata = () => {
  video.width = video.videoWidth; // change width video
  video.height = video.videoHeight; // change height video
};

video.onplay = () => {
  detect(video, canvas, socket); // detect on play
};

video.onended = () => {
  closeVideo();
};

camera.onloadedmetadata = () => {
  camera.width = camera.videoWidth; // change width camera
  camera.height = camera.videoHeight; // change height camera
};

camera.onplay = () => {
  detect(camera, canvas, socket); // detect on play
};

const webcamButton = document.getElementById("webcamButton");

webcamButton.onclick = () => {
  if (window.streaming === null) {
    // open camera
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        camera.srcObject = stream;
        container.style.display = "block"; // open video container
        camera.style.display = "block"; // open camera
        window.streaming = "webcam"; // set streaming to webcam state
        webcamButton.innerText = "Close Webcam"; // change camera button text
      })
      .catch((err) => {
        console.log("Can't open camera: " + err);
      });
  } else if (window.streaming === "webcam") {
    // close camera
    camera.srcObject.getTracks().forEach((track) => {
      track.stop();
    }); // stop webcam
    camera.style.display = "none"; // hide camera
    container.style.display = "none"; // hide video container
    camera.srcObject = null;
    window.streaming = null; // set streaming to null
    webcamButton.innerText = "Open Webcam"; // change camera button text
  } else alert(`Can't handle more than 1 stream\nCurrently streaming : ${window.streaming}`); // if streaming video
};

const inputVideo = document.getElementById("inputVideo");
const videoButton = document.getElementById("vidButton");

// closing video
const closeVideo = () => {
  window.streaming = null; // set streaming state to null
  inputVideo.value = ""; // reset input video
  // revoke url
  const url = video.src;
  video.src = "";
  URL.revokeObjectURL(url);

  video.style.display = "none"; // hide video
  container.style.display = "none"; // hide video container
  videoButton.innerText = "Open Video"; // change video button text
};

videoButton.onclick = () => {
  if (window.streaming === null) {
    inputVideo.click();
  } else if (window.streaming === "video") {
    closeVideo();
  } else alert(`Can't handle more than 1 stream\nCurrently streaming : ${window.streaming}`);
};

inputVideo.onchange = (e) => {
  // open video
  const url = URL.createObjectURL(e.target.files[0]); // create blob url
  video.src = url;
  container.style.display = "block"; // open video container
  video.style.display = "block"; // open video
  window.streaming = "video"; // set streaming state to video
  videoButton.innerText = "Close Video"; // change video button text
};
