package controllers

import (
	"fmt"
	"net/http"
	"strings"

	"marketplace/internal/database"
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
		EmpNo:          models.StringOrNil(input.EmpNo),
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

func Logout(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid request", "Authorization header missing"))
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")

	database.BlacklistToken(tokenString)

	c.JSON(http.StatusOK, utils.SuccessResponse("Logged out successfully", nil))
}

// ChangePassword lets an authenticated user change their own password.
// Requires the current password to be supplied and verified.
func ChangePassword(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}

	var input models.ChangePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	user, err := repositories.GetUserByID(fmt.Sprintf("%v", userID))
	if err != nil {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found"))
		return
	}

	if !utils.CheckPasswordHash(input.CurrentPassword, user.PasswordHash) {
		// 400, not 401: several frontends auto-logout on 401, which would
		// otherwise kick the user out just for mistyping their current password.
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid request", "Current password is incorrect"))
		return
	}

	hashed, err := utils.HashPassword(input.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to update password", err.Error()))
		return
	}

	if err := repositories.UpdateUserPassword(user.ID, hashed); err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to update password", err.Error()))
		return
	}

	// Invalidate the current token so other sessions must re-authenticate
	// with the new password; this session's token is blacklisted too and
	// the client is expected to log in again to obtain a fresh one.
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		database.BlacklistToken(strings.TrimPrefix(authHeader, "Bearer "))
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Password changed successfully. Please log in again.", nil))
}

// AdminResetPassword lets an ADMIN set a new password for another user.
// This is the realistic "forgot password" flow supported by the current
// architecture (no email/OTP/SMTP infrastructure exists to build a
// self-service reset). The admin communicates the new password to the
// user through an existing offline channel.
func AdminResetPassword(c *gin.Context) {
	id := c.Param("id")

	var input models.AdminResetPasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	user, err := repositories.GetUserByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("User not found", "User not found"))
		return
	}

	hashed, err := utils.HashPassword(input.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to reset password", err.Error()))
		return
	}

	if err := repositories.UpdateUserPassword(user.ID, hashed); err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to reset password", err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse("Password reset successfully", nil))
}
