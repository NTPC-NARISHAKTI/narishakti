package controllers

import (
	"fmt"
	"net/http"
	"strings"

	"marketplace/internal/models"
	"marketplace/internal/services"
	"marketplace/internal/utils"

	"github.com/gin-gonic/gin"
)

// isAdmin reports whether the authenticated caller has the ADMIN role.
func isAdmin(c *gin.Context) bool {
	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	return strings.EqualFold(roleStr, "ADMIN")
}

func CreateUser(c *gin.Context) {
	var input struct {
		EmpNo     string `json:"EmpNo"`
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
		EmpNo:          models.StringOrNil(input.EmpNo),
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

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}
	updatedBy := uint(userID.(float64))

	admin := isAdmin(c)
	if !admin && fmt.Sprintf("%v", updatedBy) != id {
		c.JSON(http.StatusForbidden, utils.ErrorResponse("Forbidden", "You can only update your own profile"))
		return
	}

	User, err := services.GetUser(id)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("User not found", "User not found"))
		return
	}

	// Parse JSON into a map to manually handle fields
	var jsonData map[string]interface{}
	if err := c.ShouldBindJSON(&jsonData); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid input", err.Error()))
		return
	}

	// Non-admin callers may only update their own contact details.
	// Role, ApprovalStatus, ProjectID, EmpNo and Password are privileged/
	// identity fields and must go through admin endpoints or the dedicated
	// change-password flow, otherwise any authenticated user could grant
	// themselves ADMIN via this endpoint.
	if val, ok := jsonData["PhoneNo"]; ok {
		if str, ok := val.(string); ok {
			User.PhoneNo = str
		}
	}

	if admin {
		if val, ok := jsonData["EmpNo"]; ok {
			if str, ok := val.(string); ok {
				User.EmpNo = models.StringOrNil(str)
			}
		}
		if val, ok := jsonData["Name"]; ok {
			if str, ok := val.(string); ok {
				User.Name = str
			}
		}
		if val, ok := jsonData["Email"]; ok {
			if str, ok := val.(string); ok {
				User.Email = str
			}
		}
		if val, ok := jsonData["Role"]; ok {
			if str, ok := val.(string); ok {
				User.Role = str
			}
		}
		if val, ok := jsonData["Password"]; ok {
			if str, ok := val.(string); ok && str != "" {
				// Hash the password before saving
				hashed, hashErr := utils.HashPassword(str)
				if hashErr != nil {
					c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to hash password", hashErr.Error()))
					return
				}
				User.PasswordHash = hashed
			}
		}
		if val, ok := jsonData["ProjectID"]; ok {
			// Handle nil/null values
			if val == nil {
				User.ProjectID = nil
			} else if num, ok := val.(float64); ok {
				if num > 0 {
					projectID := uint(num)
					User.ProjectID = &projectID
				} else {
					User.ProjectID = nil
				}
			}
		}
	}

	err = services.UpdateUser(&User, updatedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to update user", err.Error()))
		return
	}

	// Fetch the updated user with Project preloaded
	updatedUser, _ := services.GetUser(id)
	c.JSON(http.StatusOK, utils.SuccessResponse("User updated successfully", updatedUser))
}

func DeleteUser(c *gin.Context) {
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, utils.ErrorResponse("Forbidden", "Only administrators can delete users"))
		return
	}

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

func CaptainApproveUser(c *gin.Context) {
	id := c.Param("id")

	userToApprove, err := services.GetUser(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("User not found", "User not found"))
		return
	}

	captainUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}

	captain, err := services.GetUser(fmt.Sprintf("%v", captainUserID))
	if err != nil {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "Captain not found"))
		return
	}

	if captain.ProjectID == nil || userToApprove.ProjectID == nil || *captain.ProjectID != *userToApprove.ProjectID {
		c.JSON(http.StatusForbidden, utils.ErrorResponse("Forbidden", "You can only approve users in your project"))
		return
	}

	approvedBy := uint(captainUserID.(float64))

	if err := services.ApproveUser(id, approvedBy); err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to approve user", err.Error()))
		return
	}
	c.JSON(http.StatusOK, utils.SuccessResponse("User approved successfully", nil))
}

func CaptainRejectUser(c *gin.Context) {
	id := c.Param("id")

	userToReject, err := services.GetUser(id)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("User not found", "User not found"))
		return
	}

	captainUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "User not found in context"))
		return
	}

	captain, err := services.GetUser(fmt.Sprintf("%v", captainUserID))
	if err != nil {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Unauthorized", "Captain not found"))
		return
	}

	if captain.ProjectID == nil || userToReject.ProjectID == nil || *captain.ProjectID != *userToReject.ProjectID {
		c.JSON(http.StatusForbidden, utils.ErrorResponse("Forbidden", "You can only reject users in your project"))
		return
	}

	rejectedBy := uint(captainUserID.(float64))

	if err := services.RejectUser(id, rejectedBy); err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to reject user", err.Error()))
		return
	}
	c.JSON(http.StatusOK, utils.SuccessResponse("User rejected successfully", nil))
}
