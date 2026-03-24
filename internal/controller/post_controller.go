package controllers

import (
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/services"
	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

func CreatePost(c *gin.Context) {
	var post models.Post

	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	userRole, _ := c.Get("role")
	roleStr, _ := userRole.(string)

	err := services.CreatePost(&post, roleStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create post", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Post created successfully", post))
}

func GetPosts(c *gin.Context) {
	posts, err := services.GetPosts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to fetch posts", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Posts fetched successfully", posts))
}

func GetPost(c *gin.Context) {
	id := c.Param("id")

	post, err := services.GetPost(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Post not found", "Post not found"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Post fetched successfully", post))
}

func UpdatePost(c *gin.Context) {
	id := c.Param("id")

	post, err := services.GetPost(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Post not found", "Post not found"))
		return
	}

	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	err = services.UpdatePost(&post)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to update post", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Post updated successfully", post))
}

func DeletePost(c *gin.Context) {
	id := c.Param("id")

	post, err := services.GetPost(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Post not found", "Post not found"))
		return
	}

	err = services.DeletePost(&post)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to delete post", err.Error()))
		return
	}

	c.JSON(http.StatusNoContent, utils.SuccessResponse("Post deleted successfully", nil))
}
