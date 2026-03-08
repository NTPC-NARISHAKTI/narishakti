package repositories

import (
	"marketplace/internal/database"
	"marketplace/internal/models"
)

func CreateUser(user *models.User) error {
	return database.DB.Create(user).Error
}

func GetUsers() ([]models.User, error) {

	var users []models.User

	err := database.DB.Find(&users).Error

	return users, err
}

func GetUserByID(id string) (models.User, error) {

	var user models.User

	err := database.DB.First(&user, id).Error

	return user, err
}

func UpdateUser(user *models.User) error {
	return database.DB.Save(user).Error
}

func DeleteUser(user *models.User) error {
	return database.DB.Delete(user).Error
}
