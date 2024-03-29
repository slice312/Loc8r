const mongoose = require("mongoose");
const Location = mongoose.model("Location");
const User = mongoose.model("User");


module.exports.reviewsCreate = function (request, response) {
    getAuthor(request, response, reviewCreate);
};


const getAuthor = function (request, response, callback) {
    if (request.payload?.email) {
        User.findOne({email: request.payload.email})
            .exec(function (err, user) {
                if (err) {
                    console.log(err);
                    sendJsonResponse(response, 400, err);
                } else if (!user)
                    sendJsonResponse(response, 404, {message: "User not found"})

                callback(request, response, user);
            });
    } else
        sendJsonResponse(response, 404, {message: "User not found"});
};


const reviewCreate = function (request, response, user) {
    const locationId = request.params.location_id;
    if (locationId) {
        Location.findById(locationId)
            .select("reviews")
            .exec(function (err, location) {
                if (err) {
                    console.log(err);
                    sendJsonResponse(response, 400, err);
                } else
                    addReview(request, response, location, user);
            });
    } else {
        const err = {message: "No location_id in request"};
        console.log(err);
        sendJsonResponse(response, 400, err);
    }
};


const addReview = function (request, response, location, user) {
    if (!location)
        sendJsonResponse(response, 404, {message: "location_id not found"});
    else {
        const newReview = {
            author: user.name,
            rating: request.body.rating,
            reviewText: request.body.reviewText,
        };

        location.reviews.push(newReview);

        location.save(function (err, loc) {
            if (err) {
                console.log(err);
                sendJsonResponse(response, 400, err);
            }
            else {
                updateAvgRating(loc);
                sendJsonResponse(response, 201, newReview);
            }
        });
    }
};


const updateAvgRating = function (location) {
    if (location.reviews && location.reviews.length) {
        const ratingSum = location.reviews.reduce((acc, x) => acc + x.rating, 0);
        location.rating = Math.round(ratingSum / location.reviews.length);
        location.save(function (err) {
            if (err)
                console.log(err);
            else
                console.log("Average rating updated to", location.rating);
        });
    }
};


// TODO: отрефакторить
module.exports.reviewsReadOne = function (request, response) {
    if (request.params && request.params.location_id && request.params.review_id) {
        Location.findById(request.params.location_id)
            .select("name reviews")
            .exec(function (err, location) {
                if (err) {
                    console.log(err);
                    sendJsonResponse(response, 400, err);
                }
                else if (!location)
                    sendJsonResponse(response, 404, {message: "location_id not found"});
                else {
                    if (location.reviews && location.reviews.length) {
                        const review = location.reviews.id(request.params.review_id);
                        if (!review)
                            sendJsonResponse(response, 404, {message: "review_id not found"});
                        else {
                            const response = {
                                location: {
                                    name: location.name,
                                    id: request.params.location_id
                                },
                                review: review
                            };

                            sendJsonResponse(response, 200, response);
                        }
                    } else
                        sendJsonResponse(response, 404, {message: "No reviews found"});
                }
            });
    } else {
        const err = {message: "No location_id, review_id in request"};
        console.log(err);
        sendJsonResponse(response, 400, err);
    }
};


// TODO: отрефакторить
module.exports.reviewsUpdateOne = function (request, response) {
    if (request.params && request.params.location_id && request.params.review_id) {
        Location.findById(request.params.location_id)
            .select("reviews")
            .exec(function (err, location) {
                if (err) {
                    console.log(err);
                    sendJsonResponse(response, 400, err);
                }
                else if (!location)
                    sendJsonResponse(response, 404, {message: "location_id not found"});
                else {
                    if (location.reviews && location.reviews.length) {
                        const review = location.reviews.id(request.params.review_id);
                        if (!review)
                            sendJsonResponse(response, 404, {message: "review_id not found"});
                        else {
                            review.author = request.body.author;
                            review.rating = request.body.rating;
                            review.reviewText = request.body.reviewText;

                            location.save(function (err, loc) {
                                if (err) {
                                    console.log(err);
                                    sendJsonResponse(response, 400, err);
                                }
                                else {
                                    updateAvgRating(loc);
                                    sendJsonResponse(response, 200, review);
                                }
                            });
                        }

                    } else
                        sendJsonResponse(response, 404, {message: "No reviews found"});
                }
            });
    } else {
        const err = {message: "No location_id, review_id in request"};
        console.log(err);
        sendJsonResponse(response, 400, err);
    }
};


module.exports.reviewsDeleteOne = function (request, response) {
    if (request.params && request.params.location_id && request.params.review_id) {
        Location.findById(request.params.location_id)
            .exec(function (err, location) {
                if (err) {
                    console.log(err);
                    sendJsonResponse(response, 400, err);
                }
                else if (!location)
                    sendJsonResponse(response, 404, {message: "location_id not found"});
                else {
                    if (location.reviews && location.reviews.length) {
                        const review = location.reviews.id(request.params.review_id);
                        if (!review)
                            sendJsonResponse(response, 404, {message: "review_id not found"});
                        else {
                            review.remove();
                            location.save(function (err) {
                                if (err) {
                                    console.log(err);
                                    sendJsonResponse(response, 400, err);
                                }
                                else {
                                    updateAvgRating(location);
                                    sendJsonResponse(response, 204, null);
                                }
                            });
                        }
                    } else
                        sendJsonResponse(response, 404, {message: "No reviews found"});
                }
            });
    } else {
        const err = {message: "No location_id, review_id in request"};
        console.log(err);
        sendJsonResponse(response, 400, {message: "No location_id, review_id in request"});
    }
};


const sendJsonResponse = function (response, status, content) {
    response.status(status);
    response.header("Access-Control-Allow-Origin", "*");
    response.json(content);
};