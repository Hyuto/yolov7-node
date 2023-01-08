import { renderBoxes } from "./utils.js";

/**
 * Do detection process to show boxes in canvas
 * WARNING: this function really depended on global streaming state and modelInputShape
 * @param {HTMLImageElement|HTMLVideoElement} src Image to detect
 * @param {HTMLCanvasElement} canvas canvas to draw boxes
 * @param {any} socket socket.io object
 */
export const detect = (src, canvas, socket) => {
  const ctx = canvas.getContext("2d");
  const [modelWidth, modelHeight] = window.modelInputShape.slice(2, 4); // get model input width and height

  const cap = new cv.VideoCapture(src); // capture video
  const mat = new cv.Mat(src.height, src.width, cv.CV_8UC4); // original frame
  const matC3 = new cv.Mat(src.height, src.width, cv.CV_8UC3); // resize to new image matrix

  const processVideo = async () => {
    try {
      // if streaming is off
      if (window.streaming === null) {
        // clean memory.
        mat.delete();
        matC3.delete();
        return;
      }
      // start processing.
      cap.read(mat); // read video frame
      cv.cvtColor(mat, matC3, cv.COLOR_RGBA2BGR); // RGBA to BGR

      // padding image to [n x n] dim
      const maxSize = Math.max(matC3.rows, matC3.cols); // get max size from width and height
      const xPad = maxSize - matC3.cols, // set xPadding
        xRatio = maxSize / matC3.cols; // set xRatio
      const yPad = maxSize - matC3.rows, // set yPadding
        yRatio = maxSize / matC3.rows; // set yRatio
      const matPad = new cv.Mat(); // new mat for padded image
      cv.copyMakeBorder(matC3, matPad, 0, yPad, 0, xPad, cv.BORDER_CONSTANT, [0, 0, 0, 255]); // padding black

      const input = cv.blobFromImage(
        matPad,
        1 / 255.0,
        new cv.Size(modelWidth, modelHeight),
        new cv.Scalar(0, 0, 0),
        true,
        false
      ); // preprocessing image matrix

      const array = input.data32F.slice(); // image array
      const boxes = await new Promise((resolve) => {
        socket.emit("videoframe", array, xRatio, yRatio, (boxes) => {
          resolve(boxes);
        });
      }); // send image array to backend and await response (boxes)
      renderBoxes(boxes, ctx); // render boxes
      input.delete(); // clean memory

      requestAnimationFrame(processVideo); // request next frame
    } catch (err) {
      console.error(err);
    }
  };

  processVideo(); // start
};
