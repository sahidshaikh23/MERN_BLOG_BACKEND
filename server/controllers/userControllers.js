const HttpError = require("../models/errorModel");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, password2 } = req.body;

    if (!name || !email || !password || !password2) {
      return next(new HttpError("Fill in all feilds.", 422));
    }

    const emailExists = await User.findOne({ email });

    if (emailExists) {
      return next(new HttpError("Email already exists.", 422));
    }

    if (password.trim().length < 6) {
      return next(new HttpError("Password should be 6 characters.", 424));
    }

    if (password != password2) {
      return next(
        new HttpError("Password And ConfirmPassword Is Not Match.", 424),
      );
    }

    const salt = await bcryptjs.genSalt(10);

    const hashPassword = await bcryptjs.hash(password, salt);

    const newUser = await User.create({ name, email, password: hashPassword });

    res.status(201).json(newUser);
  } catch (error) {
    return next(new HttpError("User Registration failed.", 422));
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new HttpError("Please Fill The All Feild", 424));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(new HttpError("User Is Not Register", 422));
    }

    const comparePass = await bcryptjs.compare(password, user.password);

    if (!comparePass) {
      return next(new HttpError("Password is not match", 424));
    }

    const { _id: id, name } = user;

    const token = jwt.sign({ id, name }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({ token, id, name });
  } catch (error) {
    return next(new HttpError("Failed To Login", 422));
  }
};

const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");

    if (!user) {
      return next(new HttpError("User is not found", 404));
    }
    res.status(200).json(user);
  } catch (error) {
    return next(new HttpError("Failed To Fetch User Details.", 424));
  }
};

const changeAvatar = async (req, res, next) => {
  try {
    if (!req.files.avatar) {
      return next(new HttpError("Please choose an image.", 422));
    }

    // Fetch the user from the database
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new HttpError("User not found.", 404));
    }

    if (user.avatar) {
      const avatarPath = path.join(__dirname, "..", "uploads", user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlink(avatarPath, (err) => {
          if (err) {
            return next(new HttpError(err));
          }
        });
      }
    }


    const { avatar } = req.files;

    if (avatar.size > 500000) {
      return next(
        new HttpError(
          "Profile picture is too big, should be less than 500kb",
          422,
        ),
      );
    }

    let fileName = avatar.name;
    let splittedFilename = fileName.split(".");
    let newFilename =
      splittedFilename[0] +
      uuid() +
      "." +
      splittedFilename[splittedFilename.length - 1];

    avatar.mv(
      path.join(__dirname, "..", "uploads", newFilename),
      async (err) => {
        if (err) {
          return next(new HttpError(err));
        }

        // Update the user's avatar property in the database
        const updatedAvatar = await User.findByIdAndUpdate(
          req.user.id,
          { avatar: newFilename },
          { new: true },
        );
        if (!updatedAvatar) {
          return next(new HttpError("Avatar could not be changed", 422));
        }

        res.status(200).json(updatedAvatar);
      },
    );
  } catch (error) {
    return next(new HttpError(error));
  }
};

const editUser = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword, newConfirmPassword } =
      req.body;

    if (
      !name ||
      !email ||
      !currentPassword ||
      !newPassword ||
      !newConfirmPassword
    ) {
      return next(new HttpError("Fill in all feild", 422));
    }

    // get user from database

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new HttpError("User not found.", 404));
    }

    // make sure new email doesn't exist
    const emailExist = await User.findOne({ email });
    //  we want to update other details with/without changing the email (which is unique id because we use it to login)
    if (emailExist && emailExist._id != req.user.id) {
      return next(new HttpError("Email already exist.", 422));
    }

    //  compare current passowrd to the dbpassword

    const validateUserPassword = await bcryptjs.compare(
      currentPassword,
      user.password,
    );

    if (!validateUserPassword) {
      return next(new HttpError("Invaild Current password", 404));
    }

    // compare new password
    if (newPassword !== newConfirmPassword) {
      return next(new HttpError("New Password is not match", 422));
    }

    const salt = await bcryptjs.genSalt(10);

    const hashPassword = await bcryptjs.hash(newPassword, salt);

    // update user info in database
    const newInfo = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hashPassword },
      { new: true },
    );

    res.status(200).json(newInfo);
  } catch (error) {
    return next(new HttpError(error));
  }
};

const getAuthors = async (req, res, next) => {
  try {
    const authors = await User.find().select("-password");

    if (!authors) {
      return next(new HttpError("There Is No Authors", 404));
    }

    res.json(authors);
  } catch (error) {
    return next(new HttpError("Authors is not found.", 404));
  }
};

module.exports = {
  getAuthors,
  getUser,
  editUser,
  changeAvatar,
  registerUser,
  loginUser,
};
