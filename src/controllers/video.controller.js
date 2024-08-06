import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import mongoose from "mongoose";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const uploadVideo = asyncHandler(async (req, res) => {
   const { owner, thumbnail, title, description } = req.body;

   const videoFile = await uploadOnCloudinary(videoFile);
   const videoLocalPath = req.file?.Video[0]?.path;
   const uploadedVideo = await Video.findById(video._id).select(
      "-duration -description"
   );
   if (!uploadedVideo) {
      throw new ApiError(404, "Video not uploaded");
   }
   if (!videoLocalPath){
      throw new ApiError(401, "File not found")
   }
      
   const video = await Video.create({
      videoFile: videoFile.url,
      thumbnail,
      title,
      description,
      duration: videoFile.length(),
      owner,
   });
   return res
      .status(200)
      .json(new ApiResponse(200, uploadedVideo, "Video uploaded successfully"));
});
export { uploadVideo };
