import { detect } from "./detect.js";

const socket = io();
window.streaming = null;

const camera = document.getElementById("cameraInput"); // video is the id of video tag
const video = document.getElementById("videoInput"); // video is the id of video tag
const canvas = document.getElementById("canvas");
const container = document.getElementById("videoContainer");

video.onloadedmetadata = () => {
  video.width = video.videoWidth; // change width video
  video.height = video.videoHeight; // change height video
};

video.onplay = () => {
  detect(video, canvas, socket);
};

video.onended = () => {
  closeVideo();
};

camera.onloadedmetadata = () => {
  camera.width = camera.videoWidth; // change width video
  camera.height = camera.videoHeight; // change height video
};

camera.onplay = () => {
  detect(camera, canvas, socket);
};

const webcamButton = document.getElementById("webcamButton"); // video is the id of video tag

webcamButton.onclick = () => {
  if (window.streaming === null) {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        camera.srcObject = stream;
        container.style.display = "block";
        camera.style.display = "block";
        window.streaming = "webcam";
        webcamButton.innerText = "Close Webcam";
      })
      .catch((err) => {
        console.log("Can't open camera: " + err);
      });
  } else if (window.streaming === "webcam") {
    camera.srcObject.getTracks().forEach((track) => {
      track.stop();
    });
    camera.style.display = "none";
    container.style.display = "none";
    camera.srcObject = null;
    window.streaming = null;
    webcamButton.innerText = "Open Webcam";
  } else alert(`Can't handle more than 1 stream\nCurrently streaming : ${window.streaming}`);
};

const inputVideo = document.getElementById("inputVideo");
const videoButton = document.getElementById("vidButton");

const closeVideo = () => {
  window.streaming = null;
  inputVideo.value = "";
  const url = video.src;
  video.src = "";
  URL.revokeObjectURL(url);
  video.style.display = "none";
  container.style.display = "none";
  videoButton.innerText = "Open Video";
};

videoButton.onclick = () => {
  if (window.streaming === null) {
    inputVideo.click();
  } else if (window.streaming === "video") {
    closeVideo();
  } else alert(`Can't handle more than 1 stream\nCurrently streaming : ${window.streaming}`);
};

inputVideo.onchange = (e) => {
  const url = URL.createObjectURL(e.target.files[0]);
  video.src = url;
  container.style.display = "block";
  video.style.display = "block";
  window.streaming = "video";
  videoButton.innerText = "Close Video";
};
