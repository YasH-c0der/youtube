import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import upload from "../middlewares/multer.middleware.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // register a user means save the users data in the users database
    // to register user enters some details
    // import the users models schema
    // post request daalni padegi so that all the entries get posted to a particular database when the url is hit
    const { fullName, username, email, password } = req.body;
    console.log("email: ", email);
    console.log("username: ", username);

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

    // if(existedUser){
    //     throw new ApiError(409, "Username or email already exists")
    // }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    console.log("this is path; ", avatarLocalPath);
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar not available on local path");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar not found on cloudinary");
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
        throw new ApiError(500, "Something went wrong while registering");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser)
    )
});


export default registerUser;
