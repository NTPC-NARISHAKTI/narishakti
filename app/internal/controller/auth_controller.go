package controllers

import (
	"fmt"
	"net/http"

	"marketplace/internal/models"
	"marketplace/internal/repositories"
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
		EmpNo:          input.EmpNo,
		Email:          input.Email,
		PasswordHash:   input.Password, // It will be hashed inside RegisterUser service
		Role:           "USER",
		ApprovalStatus: "PENDING",
		ProjectID:      input.ProjectID,
	}

	createdUser, err := services.RegisterUser(&user, input.ConfirmPassword)
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

	projectName := ""
	if user.Project.Name != "" {
		projectName = user.Project.Name
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Login successful", gin.H{
		"token": token,
		"user": gin.H{
			"id":             user.ID,
			"name":           user.Name,
			"email":          user.Email,
			"empNo":          user.EmpNo,
			"role":           user.Role,
			"projectId":      user.ProjectID,
			"projectName":    projectName,
			"approvalStatus": user.ApprovalStatus,
		},
	}))
}

func GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}

	user, err := repositories.GetUserByID(fmt.Sprintf("%v", userID))
	if err != nil {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found"))
		return
	}

	projectName := ""
	if user.Project.Name != "" {
		projectName = user.Project.Name
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("User info retrieved", gin.H{
		"id":             user.ID,
		"name":           user.Name,
		"email":          user.Email,
		"empNo":          user.EmpNo,
		"role":           user.Role,
		"projectId":      user.ProjectID,
		"projectName":    projectName,
		"approvalStatus": user.ApprovalStatus,
	}))
}
