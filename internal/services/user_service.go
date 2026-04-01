package services

import (
	"marketplace/internal/models"
	"marketplace/internal/repositories"
	"marketplace/internal/utils"
)

func CreateUser(User *models.User) error {
	// Hash the password
	hashed, err := utils.HashPassword(User.PasswordHash)
	if err != nil {
		return err
	}
	User.PasswordHash = hashed

	return repositories.CreateUser(User)
}

func GetUsers() ([]models.User, error) {
	return repositories.GetUsers()
}

func GetUser(id string) (models.User, error) {
	return repositories.GetUserByID(id)
}

func UpdateUser(User *models.User) error {
	return repositories.UpdateUser(User)
}

func DeleteUser(User *models.User) error {
	return repositories.DeleteUser(User)
}

func ApproveUser(id string, approvedBy uint) error {
	user, err := repositories.GetUserByID(id)
	if err != nil {
		return err
	}
	user.ApprovalStatus = "APPROVED"
	err = repositories.UpdateUser(&user)
	if err != nil {
		return err
	}

	// Log the user approval
	LogActivity("APPROVED", "USER", user.ID, approvedBy, "User account was approved")

	return nil
}

func RejectUser(id string, rejectedBy uint) error {
	user, err := repositories.GetUserByID(id)
	if err != nil {
		return err
	}
	user.ApprovalStatus = "REJECTED"
	err = repositories.UpdateUser(&user)
	if err != nil {
		return err
	}

	// Log the user rejection
	LogActivity("REJECTED", "USER", user.ID, rejectedBy, "User account was rejected")

	return nil
}
