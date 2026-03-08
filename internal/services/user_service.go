package services

import (
	"marketplace/internal/models"
	"marketplace/internal/repositories"
)

func CreateUser(User *models.User) error {
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
