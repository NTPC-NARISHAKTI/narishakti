package repositories

import (
	"marketplace/internal/database"
	"marketplace/internal/models"
)

func CreateLog(log *models.Log) error {
	return database.DB.Create(log).Error
}

func GetLogs() ([]models.Log, error) {
	var logs []models.Log
	err := database.DB.Order("timestamp DESC").Find(&logs).Error
	return logs, err
}

func GetLogByID(id string) (models.Log, error) {
	var log models.Log
	err := database.DB.First(&log, id).Error
	return log, err
}

func UpdateLog(log *models.Log) error {
	return database.DB.Save(log).Error
}

func DeleteLog(log *models.Log) error {
	return database.DB.Delete(log).Error
}
