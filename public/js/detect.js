import { renderBoxes } from "./utils.js";

/**
 * Do detection process to show boxes in canvas
 * WARNING: this function really depended on global streaming state and modelInputShape
 */
export const detect = (src, canvas, socket) => {
  const ctx = canvas.getContext("2d");
  const [modelWidth, modelHeight] = window.modelInputShape.slice(2, 4); // get model input width and height

  const cap = new cv.VideoCapture(src); // capture video
  const mat = new cv.Mat(src.height, src.width, cv.CV_8UC4); // original frame
  const matC3 = new cv.Mat(modelWidth, modelHeight, cv.CV_8UC3); // resize to new image matrix

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
      const input = cv.blobFromImage(
        matC3,
        1 / 255.0,
        new cv.Size(modelWidth, modelHeight),
        new cv.Scalar(0, 0, 0),
        true,
        false
      ); // preprocessing image matrix to blob
      const array = input.data32F.slice(); // image array
      const boxes = await new Promise((resolve) => {
        socket.emit("videoframe", array, (boxes) => {
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
