const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Movie = require("./Model/Movie");
const Review = require("./Model/Review");
const User = require("./Model/User");

const app = express();
app.use(express.json());

mongoose
  .connect("mongodb://localhost/movie-reviews", {})
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const verifyToken = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ error: "Access denied. Token not provided" });
  }

  try {
    const decoded = jwt.verify(token, "secret");
    req.user = decoded; // Add user information to the request object
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Movie endpoints
app.post("/movies", verifyToken, async (req, res) => {
  try {
    const { title, director, releaseYear, genre } = req.body;

    // Validate the input
    if (!title || !director || !releaseYear || !genre) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Create a new movie instance
    const newMovie = new Movie({
      title,
      director,
      releaseYear,
      genre,
    });

    // Save the movie to the database
    await newMovie.save();

    // Respond with the created movie
    res.status(201).json(newMovie);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/movies", verifyToken, async (req, res) => {
  try {
    // Fetch all movies from the database
    const movies = await Movie.find();

    // Respond with the list of movies
    res.status(200).json(movies);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/movies/:id", verifyToken, async (req, res) => {
  try {
    const movieId = req.params.id;

    // Fetch the movie by its ID from the database
    const movie = await Movie.findById(movieId);

    // If the movie is not found, respond with a 404 status
    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    // Respond with the movie details
    res.status(200).json(movie);
  } catch (error) {
    // Handle invalid ObjectId error
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid movie ID" });
    }

    res.status(500).json({ error: "Server error" });
  }
});

app.put("/movies/:id", verifyToken, async (req, res) => {
  try {
    const movieId = req.params.id;
    const { title, director, releaseYear, genre } = req.body;

    // Validate the input
    if (!title || !director || !releaseYear || !genre) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Find the movie by its ID and update its details
    const updatedMovie = await Movie.findByIdAndUpdate(
      movieId,
      { title, director, releaseYear, genre },
      { new: true, runValidators: true }
    );

    // If the movie is not found, respond with a 404 status
    if (!updatedMovie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    // Respond with the updated movie details
    res.status(200).json(updatedMovie);
  } catch (error) {
    // Handle invalid ObjectId error
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid movie ID" });
    }

    res.status(500).json({ error: "Server error" });
  }
});

app.get("/movies/:id/reviews", verifyToken, async (req, res) => {
  try {
    const movieId = req.params.id;

    // Find all reviews for the specific movie ID and populate userId
    const reviews = await Review.find({ movieId }).populate("userId");

    // If no reviews are found, respond with a 404 status
    if (!reviews || reviews.length === 0) {
      return res.status(404).json({ error: "No reviews found for this movie" });
    }

    // Respond with the list of reviews
    res.status(200).json(reviews);
  } catch (error) {
    // Handle invalid ObjectId error
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid movie ID" });
    }

    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/movies/:id", verifyToken, async (req, res) => {
  try {
    const movieId = req.params.id;

    // Delete the movie and associated reviews
    const deletedMovie = await Movie.findByIdAndDelete(movieId);
    await Review.deleteMany({ movieId });

    // If the movie is not found, respond with a 404 status
    if (!deletedMovie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    // Respond with a success message
    res
      .status(200)
      .json({ message: "Movie and associated reviews deleted successfully" });
  } catch (error) {
    // Handle invalid ObjectId error
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid movie ID" });
    }

    res.status(500).json({ error: "Server error" });
  }
});

// Review endpoints
app.post("/reviews", verifyToken, async (req, res) => {
  try {
    const { movieId, userId, rating, comment } = req.body;

    // Validate the input
    if (!movieId || !userId || !rating || !comment) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Create a new review instance
    const newReview = new Review({
      movieId,
      userId,
      rating,
      comment,
    });

    // Save the review to the database
    await newReview.save();

    // Respond with the created review
    res.status(201).json(newReview);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/reviews", verifyToken, async (req, res) => {
  try {
    // Fetch all reviews from the database
    const reviews = await Review.find().populate("movieId userId");

    // Respond with the list of reviews
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/reviews/:id", verifyToken, async (req, res) => {
  try {
    const reviewId = req.params.id;

    // Fetch the review by its ID from the database and populate movieId and userId
    const review = await Review.findById(reviewId).populate("movieId userId");

    // If the review is not found, respond with a 404 status
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Respond with the review details
    res.status(200).json(review);
  } catch (error) {
    // Handle invalid ObjectId error
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid review ID" });
    }

    res.status(500).json({ error: "Server error" });
  }
});

app.put("/reviews/:id", verifyToken, async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { rating, comment } = req.body;

    // Validate the input
    if (!rating || !comment) {
      return res.status(400).json({ error: "Rating and comment are required" });
    }

    // Find the review by its ID and update its details
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { rating, comment },
      { new: true, runValidators: true }
    );

    // If the review is not found, respond with a 404 status
    if (!updatedReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Respond with the updated review details
    res.status(200).json(updatedReview);
  } catch (error) {
    // Handle invalid ObjectId error
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid review ID" });
    }

    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/reviews/:id", verifyToken, async (req, res) => {
  try {
    const reviewId = req.params.id;

    // Find the review by its ID and delete it
    const deletedReview = await Review.findByIdAndDelete(reviewId);

    // If the review is not found, respond with a 404 status
    if (!deletedReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Respond with a success message
    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    // Handle invalid ObjectId error
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid review ID" });
    }

    res.status(500).json({ error: "Server error" });
  }
});

// User endpoints
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const user = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10),
    });
    await user.save();
    res.status(201).json({ message: "User registered" });
  } catch (error) {
    res.status(400).json({ error: "Error registering user" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, "secret", {
      expiresIn: "4h",
    });
    res.json({ message: "Success", token });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
