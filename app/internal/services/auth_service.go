package services

import (
	"errors"
	"marketplace/internal/models"
	"marketplace/internal/repositories"
	"marketplace/internal/utils"
	"strings"
)

func RegisterUser(user *models.User, confirmPassword string) (*models.User, error) {
	if user.PasswordHash != confirmPassword {
		return nil, errors.New("password and confirm password do not match")
	}

	// Check duplicate email
	if _, err := repositories.GetUserByEmail(user.Email); err == nil {
		return nil, errors.New("email already exists")
	}

	// Check duplicate EmpNo (only when provided - EmpNo is optional)
	if user.EmpNo != nil && *user.EmpNo != "" {
		if _, err := repositories.GetUserByEmpNo(*user.EmpNo); err == nil {
			return nil, errors.New("emp id already exists")
		}
	}

	hashed, err := utils.HashPassword(user.PasswordHash)
	if err != nil {
		return nil, err
	}
	user.PasswordHash = hashed

	// Call repo
	err = repositories.CreateUser(user)
	if err != nil {
		return nil, err
	}

	LogActivity("CREATED", "USER", user.ID, user.ID, "User registered")

	return user, nil
}

func LoginUser(email, password string) (string, *models.User, error) {
	user, err := repositories.GetUserByEmail(email)
	if err != nil {
		return "", nil, errors.New("user not found")
	}

	if strings.ToUpper(user.ApprovalStatus) == "PENDING" {
		return "", nil, errors.New("Approval pending")
	}
	if strings.ToUpper(user.ApprovalStatus) == "REJECTED" {
		return "", nil, errors.New("Registration rejected")
	}

	if !utils.CheckPasswordHash(password, user.PasswordHash) {
		return "", nil, errors.New("invalid password")
	}

	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}
