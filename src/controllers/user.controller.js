import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/APIResponse.js";
import jwt from "jsonwebtoken";
import mongoose from 
"mongoose";
const generateAcessAndRefreshTokens = async (userId) => {
   try {
      const user = await User.findById(userId);
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
      return { accessToken, refreshToken };
   } catch (error) {
      throw new ApiError(
         500,
         "Something went wrong while generating refresh and access tokens"
      );
   }
};
const registerUser = asyncHandler(async (req, res) => {
   // get user details from frontend
   const { username, email, fullName, password } = req.body;
   // console.log("email; ", email);

   if (
      [fullName, email, username, password].some(
         (field) => field?.trim() === ""
      )
   ) {
      throw new ApiError(400, "All fields are required");
   }

   const existedUser = await User.findOne({
      $or: [{ username }, { email }],
   });

   if (existedUser) {
      throw new ApiError(409, "User with email or username already exists");
   }
   const avatarLocalPath = req.files?.avatar[0]?.path;
   // const coverImageLocalPath = req.files?.coverImage[0]?.path;
   let coverImageLocalPath;
   if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
   ) {
      coverImageLocalPath = req.files.coverImage[0].path;
   }
   console.log(req.files);
   if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required!");
   }
   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath);
   if (!avatar) {
      throw new ApiError(400, "Avatar file is required!!");
   }
   const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
   });
   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   );
   if (!createdUser) {
      throw new ApiError(
         500,
         "Something went wrong while registering the user"
      );
   }
   return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});
const loginUser = asyncHandler(async (req, res) => {
   //generating a refresh token for the user and matching it, so the user could login
   // req.body -> data
   //asking for username or email
   //checking if user exists
   //password check
   //access token and refresh token
   //send cookies
   const { email, username, password } = req.body;
   if (!email && !username) {
      throw new ApiError(400, "Username or email is required for loging user!");
   }
   const user = await User.findOne({
      $or: [{ email }, { username }],
   });
   if (!user) {
      throw new ApiError(404, "User does not exist");
   }
   const isPasswordValid = await user.isPasswordCorrect(password);
   if (!isPasswordValid) {
      throw new ApiError(401, "Invalid user credentials");
   }
   const { accessToken, refreshToken } = await generateAcessAndRefreshTokens(
      user._id
   );
   const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
   );
   const options = {
      httponly: true,
      secure: true,
   };
   return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
         new ApiResponse(
            200,
            {
               user: loggedInUser,
               accessToken,
               refreshToken,
            },
            "User logged in successfully"
         )
      );
});
const logoutUser = asyncHandler(async (req, res) => {
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: undefined,
         },
      },
      {
         new: true,
      }
   );
   const options = {
      httponly: true,
      secure: true,
   };
   return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "user logged out"));
});
const refreshAccessToken = asyncHandler(async (req, res) => {
   const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
   if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request");
   }
   try {
      const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
      );
      const user = await User.findById(decodedToken?._id);
      if (!user) {
         throw new ApiError(401, "Invalid refresh token");
      }
      if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "Refresh token is expired or used");
      }
      const options = {
         httpOnly: true,
         secure: true,
      };
      const { accessToken, newRefreshToken } =
         await generateAcessAndRefreshTokens(user._id);

      return res
         .status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", newRefreshToken, options)
         .json(
            new ApiResponse(
               200,
               {
                  user,
                  accessToken,
                  refreshToken: newRefreshToken,
               },
               "Access token refreshed successfully"
            )
         );
   } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token");
   }
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
   const { oldPassword, newPassword } = req.body;
   const user = User.findById(req.user?._id);
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
   if (!isPasswordCorrect) {
      throw new ApiError(400, "invalid old password");
   }
   user.password = newPassword;
   await user.save({ validateBeforeSave: false });
   return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
   return res
      .status(200)
      .json(
         new ApiResponse(200, req.user, "current user fetched successfully")
      );
});
const updateAccountDetails = asyncHandler(async (req, res) => {
   const { fullName, email } = req.body;
   if (!(fullName || email)) {
      throw new ApiError(400, "All fields are required");
   }
   const user = User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            fullName,
            email: email,
         },
      },
      {
         new: true,
      }
   ).select("-password");
   return res
      .status(200)
      .json(new ApiError(200, user, "Account details updated successfully"));
});
const updateUserAvatar = asyncHandler(async (req, res) => {
   const avatarLocalPath = req.files?.path;
   if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required");
   }
   const avatar = await uploadOnCloudinary(avatarLocalPath);

   if (!avatar.url) {
      throw new ApiError(400, "Error while uploading avatar");
   }
   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            avatar: avatar.url,
         },
      },
      {
         new: true,
      }
   );
   return res
      .status(200)
      .json(new ApiResponse(200, user, "File uploaded successfully"));
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
   const coverImageLocalPath = req.files?.path;
   if (!coverImageLocalPath) {
      throw new ApiError(400, "cover-image file is required");
   }
   const coverImage = await uploadOnCloudinary(coverImageLocalPathocalPath);

   if (!coverImage.url) {
      throw new ApiError(400, "Error while uploading cover-image");
   }
   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            avatar: coverImage.url,
         },
      },
      {
         new: true,
      }
   );
   return res
      .status(200)
      .json(new ApiResponse(200, user, "File uploaded successfully"));
});
const getUserChannelProfile = asyncHandler(async (req, res) => {
   const { username } = req.params;
   if(!username?.trim()){
      throw new ApiError(400, "Username is required");
   }
   const channel = await User.aggregate([
      {
         $match: {
            username: username?.toLowerCase(),
         },
      },
      {
         $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers",
         },
      },
      {
         $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo",
         },
      },
      {
         $addFields: {
            subscribersCount: {
               $size: "$subscribers",
            },
            channelSubscribedToCount: {
               $size: "$subscribedTo",
            },
            isSubscribed: {
               $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false,
               },
            },
         },
      },
      {
         $project: {
            fullName: 1,
            username: 1,
            subscribersCount:1,
            channelSubscribedToCount:1,
            isSubscribed:1,
            avatar: 1,
            coverImage: 1,
            email:1,
         },
      },
   ]);
   if (!channel) {
      throw new ApiError(404,"Channel doesnot exists.")
   }
   return res
   .status(200)
   .json(new ApiResponse(200,channel[0],"User channel fetched successfully"))
});

const getWatchHistory = asyncHandler(async (req, res) => {
   const user = await User.aggregate([
      {
         $match: {
            _id: new mongoose.Types.ObjectId(req.user._id)
         }
      },
      {
         $lookup:{
            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[{
               $lookup:{
                  from:"users",
                  localField:"owner",
                  foreignField:"_id",
                  as:"owner",
                  pipeline:[
                     {
                        $project:{
                           fullName:1,
                           username:1,
                           avatar:1
                        }
                     }
                  ]
               }
            },
            {
               $addFields:{
                  owner:{
                     $first:"$owner"
                  }
               }
            }
         ]
         }
      }
   ])
   return res
   .status(200)
   .json(new ApiResponse(
      200,
      user[0].watchHistory,
      "Watch history fetched successfully"
   ))
})
export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUserCoverImage,
   getUserChannelProfile,
   getWatchHistory
};
