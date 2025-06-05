import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessandRefreshToken = async (user_id) => {
    try {
        const user = await User.findById(user_id);
        // console.log(user);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        // console.log(accessToken, refreshToken);

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            501,
            error?.message || "Something went wrong while generating tokens"
        );
    }
};

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

    return res.status(201).json(new ApiResponse(200, createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
    // take details provided by the user from the frontend part
    // find the particular dataset in the database
    // if found decrypt the password given by the user
    // if not found return no registered user of the given username

    const { username, email, password } = req.body;

    if (!(username || email)) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "User not Found!!");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid User Credentials");
    }

    const { accessToken, refreshToken } = await generateAccessandRefreshToken(
        user._id
    );
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    // console.log(accessToken, refreshToken);



    //testing codee
    
    // const sample = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
    // console.log(sample);
    


    const options = {
        httpOnly: true,
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
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                },
                "User logged In Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
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
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(201, "User LoggedOut Successfully"));
});

export { registerUser, loginUser, logoutUser };
