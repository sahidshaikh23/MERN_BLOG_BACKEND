const Post = require("../models/postModel");
const User = require("../models/userModel");
const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");
const HttpError = require("../models/errorModel");

const createPost = async (req, res, next) => {
  try {
    let { title, category, description } = req.body;
    const { thumbnail } = req.files;

    if (!title || !category || !description || !thumbnail) {
      return next(
        new HttpError("Fill in all fields and choose thumbnail.", 422),
      );
    }

    // Check the file size
    if (thumbnail.size > 2000000) {
      return next(
        new HttpError(
          "Image is too big. File should be less than 2MB",
          422,
        ),
      );
    }

    // Generate a unique filename for the thumbnail
    let fileName = thumbnail.name;
    let splittedFilename = fileName.split(".");
    let newFilename =
      splittedFilename[0] +
      uuid() +
      "." +
      splittedFilename[splittedFilename.length - 1];

    // Move the thumbnail to the uploads directory
    thumbnail.mv(
      path.join(__dirname, "..", "/uploads", newFilename),
      async (err) => {
        if (err) {
          return next(new HttpError(err));
        } else {
          // Create a new post in the database
          const newPost = await Post.create({
            title,
            category,
            description,
            thumbnail: newFilename,
            creator: req.user.id,
          });
          if (!newPost) {
            return next(new HttpError("Post couldn't be created.", 422));
          }

          // Update user post count
          const currentUser = await User.findById(req.user.id);
          const userPostCount = currentUser.posts + 1;
          await User.findByIdAndUpdate(req.user.id, {
            posts: userPostCount,
          });

          // Send response
          res.status(200).json(newPost);
        }
      },
    );
  } catch (error) {
    return next(new HttpError(error));
  }
};

const getPosts = async (req, res, next) => {
  try {
    const posts = await Post.find().sort({
      updatedAt: -1,
    });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

const getPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found.", 422));
    }
    res.status(200).json(post);
  } catch (error) {
    return next(new HttpError(error));
  }
};

const getCatPosts = async (req, res, next) => {
  try {
    const { category } = req.params;

    const catPosts = await Post.find({
      category,
    }).sort({
      createdAt: -1,
    });

    if (!catPosts) {
      return next(new HttpError("No Post is found", 422));
    }
    res.status(200).json(catPosts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

const getUserPosts = async (req, res, next) => {
  try {
    const { id } = req.params;

    const posts = await Post.find({
      creator: id,
    }).sort({
      createdAt: -1,
    });
    console.log(posts);
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

const editPost = async (req, res, next) => {
  try {
    let fileName;
    let newFilename;
    const postId = req.params.id;
    let { title, category, description } = req.body;

    if (!title || !category || description.length < 12) {
      return next(new HttpError("Fill in all fields.", 422));
    }

    let updatedPost;

    if (!req.files || Object.keys(req.files).length === 0) {
      // If no new thumbnail is uploaded, update the post without changing the thumbnail
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          title,
          category,
          description,
        },
        {
          new: true,
        },
      );
    } else {
      // If a new thumbnail is uploaded, delete the old thumbnail
      const oldPost = await Post.findById(postId);
      const oldThumbnailPath = path.join(__dirname, "..", "uploads", oldPost.thumbnail);

      if (fs.existsSync(oldThumbnailPath)) {
        fs.unlinkSync(oldThumbnailPath);
      }

      const { thumbnail } = req.files;

      // Check the file size of the new thumbnail
      if (thumbnail.size > 2000000) {
        return next(
          new HttpError("Thumbnail is too big. Should be less than 2MB", 422),
        );
      }

      fileName = thumbnail.name;
      let splittedFilename = fileName.split(".");
      newFilename =
        splittedFilename[0] +
        uuid() +
        "." +
        splittedFilename[splittedFilename.length - 1];

      await thumbnail.mv(path.join(__dirname, "..", "uploads", newFilename));

      updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          title,
          category,
          description,
          thumbnail: newFilename,
        },
        {
          new: true,
        },
      );
    }

    if (!updatedPost) {
      return next(new HttpError("Couldn't update post.", 400));
    }

    res.status(200).json(updatedPost);
  } catch (error) {
    return next(new HttpError(error));
  }
};

const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!postId) {
      return next(new HttpError("Post ID is missing.", 400));
    }

    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found.", 404));
    }

    // Check if the user is the creator of the post
    if (req.user.id !== post.creator.toString()) {
      return next(new HttpError("Unauthorized to delete this post.", 401));
    }

    // Delete the associated thumbnail image
    const imagePath = path.join(__dirname, "..", "uploads", post.thumbnail);
    fs.unlink(imagePath, async (err) => {
      if (err && err.code === 'ENOENT') {
        console.error("File does not exist.", err);
      } else if (err) {
        return next(new HttpError("Failed to delete the image.", 500));
      }

      // Delete the post from the database
      await post.remove();

      // Update user post count
      const currentUser = await User.findById(req.user.id);
      currentUser.posts -= 1;
      await currentUser.save();

      res.status(200).json({ message: "Post deleted successfully." });
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    return next(new HttpError("An error occurred while deleting the post.", 500));
  }
};

module.exports = {
  createPost,
  getCatPosts,
  getPost,
  getPosts,
  getUserPosts,
  editPost,
  deletePost,
};
