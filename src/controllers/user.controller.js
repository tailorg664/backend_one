import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/APIResponse.js";
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { userName, email, fullName, password } = req.body;
  // console.log("email; ", email);

  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or : [{ userName }, { email }]
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400,"Avatar file is required");
  }
  const Avatar = await uploadOnCloudinary(avatarLocalPath)
  const CoverImage = await uploadOnCloudinary(coverImageLocalPath)
  if (!Avatar) {
    throw new ApiError(400, "Avatar file is required");
  }
  const user = User.create({
    fullName,
    avatar: Avatar.url,
    coverImage: CoverImage?.url||"",
    email,
    password,
    username:userName.toLowerCase()
  })
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  return res.status(201).json(
    new ApiResponse(200,createdUser,"user registered successfully")
  )
});
export { registerUser };
