package controllers

import (
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/services"
	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

func CreateUser(c *gin.Context) {

	var User models.User

	if err := c.ShouldBindJSON(&User); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	err := services.CreateUser(&User)

	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create user", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse("User created successfully", User))
}

func GetUsers(c *gin.Context) {

	Users, err := services.GetUsers()

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("Users not found", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Users fetched successfully", Users))
}

func GetUser(c *gin.Context) {

	id := c.Param("id")

	User, err := services.GetUser(id)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("User not found", "User not found"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("User fetched successfully", User))
}

func UpdateUser(c *gin.Context) {

	id := c.Param("id")

	User, err := services.GetUser(id)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("User not found", "User not found"))
		return
	}

	// Bind incoming JSON to existing User
	if err := c.ShouldBindJSON(&User); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	err = services.UpdateUser(&User)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to update user", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("User updated successfully", User))
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")

	User, err := services.GetUser(id)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("User not found", "User not found"))
		return
	}
	err = services.DeleteUser(&User)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to delete user", err.Error()))
		return
	}

	c.JSON(http.StatusNoContent, utils.SuccessResponse("User deleted successfully", nil))
}

func ApproveUser(c *gin.Context) {
	id := c.Param("id")
	if err := services.ApproveUser(id); err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to approve user", err.Error()))
		return
	}
	c.JSON(http.StatusOK, utils.SuccessResponse("User approved successfully", nil))
}

func RejectUser(c *gin.Context) {
	id := c.Param("id")
	if err := services.RejectUser(id); err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to reject user", err.Error()))
		return
	}
	c.JSON(http.StatusOK, utils.SuccessResponse("User rejected successfully", nil))

}
