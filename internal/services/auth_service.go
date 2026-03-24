package services

import (
	"errors"
	"marketplace/internal/models"
	"marketplace/internal/repositories"
	"marketplace/internal/utils"
)

func RegisterUser(user *models.User) (*models.User, error) {
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

	return user, nil
}

func LoginUser(email, password string) (string, error) {
	user, err := repositories.GetUserByEmail(email)
	if err != nil {
		return "", errors.New("user not found")
	}

	if user.ApprovalStatus == "PENDING" {
		return "", errors.New("Approval pending")
	}
	if user.ApprovalStatus == "REJECTED" {
		return "", errors.New("Registration rejected")
	}

	if !utils.CheckPasswordHash(password, user.PasswordHash) {
		return "", errors.New("invalid password")
	}

	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role)
	if err != nil {
		return "", err
	}

	return token, nil
}
