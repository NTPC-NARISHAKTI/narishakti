package services

import (
	"marketplace/internal/models"
	"marketplace/internal/repositories"
)

func CreateLog(log *models.Log) error {
	return repositories.CreateLog(log)
}

func GetLogs() ([]models.Log, error) {
	return repositories.GetLogs()
}

func GetLog(id string) (models.Log, error) {
	return repositories.GetLogByID(id)
}

func UpdateLog(log *models.Log) error {
	return repositories.UpdateLog(log)
}

func DeleteLog(log *models.Log) error {
	return repositories.DeleteLog(log)
}

// LogActivity is a helper function to create activity logs
func LogActivity(action, entityType string, entityID, userID uint, details string) error {
	log := &models.Log{
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		UserID:     userID,
		Details:    details,
	}
	return CreateLog(log)
}
