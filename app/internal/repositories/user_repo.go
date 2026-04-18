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
	err := database.DB.Preload("Project").Find(&users).Error
	return users, err
}

func GetUserByID(id string) (models.User, error) {
	var user models.User
	err := database.DB.Preload("Project").First(&user, id).Error
	return user, err
}

func UpdateUser(user *models.User) error {
	return database.DB.Model(user).Select("emp_no", "name", "phone_no", "project_id", "email", "password_hash", "role", "approval_status", "updated_at", "updated_by").Save(user).Error
}

func DeleteUser(user *models.User) error {
	return database.DB.Delete(user).Error
}

// GetUserByEmail fetches a user by their email (for login)
func GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := database.DB.Preload("Project").Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserByEmpNo(empNo string) (*models.User, error) {
	var user models.User
	err := database.DB.Preload("Project").Where("emp_no = ?", empNo).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}
