import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessTokenAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        
        user.refreshToken = refreshToken
        await user.save({ValidateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating access token and refresh token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images and avatar
    // upload them to avatar
    // create user object - create entry in db
    // remove password and  refresh token feild from response 
    // check for user creation 
    // return user response


    const {fullname, email, username, password} = req.body
    
    if ([fullname, email, username, password].some((field)=> field?.trim()==="")
    ) {
        throw new ApiError(400, "fullname is required")
    }
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    if(existedUser) {
        throw new ApiError(409, "User with Email or Username already exists")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar){
        throw new ApiError(400, "Cover Image file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase(),
        email,
        password
    })

    console.log("user", user)
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const {email, username, password} = req.body
    
    // username or email
    if(!email && !username) {
        throw new ApiError(400, "Email or username is required")
    }

    // find the user in db
    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user) {
        throw new ApiError(401, "User not found")
    }
    
    // if user found then check for password
    const isPassValid = await user.isPasswordCorrect(password)

    if (!isPassValid) {
        throw new ApiError(401, "Invalid password")
    }

    // access and refresh token generation
    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    // send them in cookies
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    // return user response
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", accessToken, options)
        .json( new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        ))

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, 
        {
            $set: 
                {
                refreshToken: undefined
                }
        },
        {
            new: true,
        }

    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken")
        .clearCookie("refreshToken")
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =  req.cookies.refreshToken || req.header("Authorization")?.replace("Bearer ", "") || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token not found")
    }

    try {
        decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
        
        if(incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
    
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateUsername = asyncHandler(async(req, res) => {
    const {username, fullname} = req.body

    if (!username) {
        throw new ApiError(400, "Username is required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set: {
                username: username.toLowerCase(), 
                fullname: fullname
            }
        }, 
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "Username and fullname updated successfully"
        )
    )
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "Username and fullname updated successfully"
        )
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "Username and fullname updated successfully"
        )
    )
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const { username } = req.params

    if(!username?.trim()) {
        throw new ApiError(400, "username is missing ")
    }

    const channel = await User.aggregate([
        {
            $match: 
                    {
                        username: username.toLowerCase()
                    }
        },
        {
            $lookup: 
                    {
                        from: "subscriptions",
                        localField: "_id",
                        foreignField: "channel",
                        as: "subscribers"
                    }
        },
        {
            $lookup: 
                    {
                        from: "subscriptions",
                        localField: "_id",
                        foreignField: "subscriber",
                        as: "subscribedTo"
                    }
        },
        {
            $addFields: 
                    {
                        subscriberCount: {
                            $size: "$subscribers"
                        },
                        channelsSubscribedToCount: {
                            $size: "$subscribedTo"
                        },
                        isSubscribed: {
                            $cond: {
                                if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                                then: true,
                                else: false
                            }
                        }
                    }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }         
    ])

    if(!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }

        },

    ])
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export  {
            registerUser, 
            loginUser, 
            logoutUser, 
            refreshAccessToken, 
            changeCurrentPassword, 
            getCurrentUser, 
            updateUsername,
            updateUserAvatar,
            updateUserCoverImage,
            getUserChannelProfile,
            getWatchHistory
        } 