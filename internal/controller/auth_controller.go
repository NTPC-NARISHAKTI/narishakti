package controllers

import (
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/services"
	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

func Register(c *gin.Context) {
	var input models.RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	user := models.User{
		Name:           input.Name,
		Email:          input.Email,
		PasswordHash:   input.Password, // It will be hashed inside RegisterUser service
		Role:           "USER",
		ApprovalStatus: "PENDING",
	}

	createdUser, err := services.RegisterUser(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to register user", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse("User registered successfully", createdUser))
}

func Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	token, user, err := services.LoginUser(input.Email, input.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Login failed", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Login successful", gin.H{
		"token": token,
		"user": gin.H{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	}))
}
