package controllers

import (
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/services"
	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

func CreateUser(c *gin.Context) {
	var input struct {
		EmpNo     string `json:"EmpNo" binding:"required"`
		Name      string `json:"Name" binding:"required"`
		Email     string `json:"Email" binding:"required,email"`
		PhoneNo   string `json:"PhoneNo"`
		Password  string `json:"Password" binding:"required,min=6"`
		Role      string `json:"Role" binding:"required"`
		ProjectID *uint  `json:"ProjectID"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	user := models.User{
		EmpNo:          input.EmpNo,
		Name:           input.Name,
		Email:          input.Email,
		PhoneNo:        input.PhoneNo,
		PasswordHash:   input.Password, // Will be hashed in service
		Role:           input.Role,
		ApprovalStatus: "APPROVED", // Auto-approve for admin-created users
	}

	if input.ProjectID != nil {
		user.ProjectID = input.ProjectID
	}

	err := services.CreateUser(&user)

	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create user", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse("User created successfully", user))
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

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	updatedBy := uint(userID.(float64))

	err = services.UpdateUser(&User, updatedBy)
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
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	deletedBy := uint(userID.(float64))

	err = services.DeleteUser(&User, deletedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to delete user", err.Error()))
		return
	}

	c.JSON(http.StatusNoContent, utils.SuccessResponse("User deleted successfully", nil))
}

func ApproveUser(c *gin.Context) {
	id := c.Param("id")
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	approvedBy := uint(userID.(float64))

	if err := services.ApproveUser(id, approvedBy); err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to approve user", err.Error()))
		return
	}
	c.JSON(http.StatusOK, utils.SuccessResponse("User approved successfully", nil))
}

func RejectUser(c *gin.Context) {
	id := c.Param("id")
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	rejectedBy := uint(userID.(float64))

	if err := services.RejectUser(id, rejectedBy); err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to reject user", err.Error()))
		return
	}
	c.JSON(http.StatusOK, utils.SuccessResponse("User rejected successfully", nil))
}
