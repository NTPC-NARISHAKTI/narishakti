package repositories

import (
	"marketplace/internal/database"
	"marketplace/internal/models"
)

func CreateProject(product *models.Project) error {
	return database.DB.Create(product).Error
}

func GetProjects() ([]models.Project, error) {

	var projects []models.Project

	err := database.DB.Find(&projects).Error

	return projects, err
}

func GetProjectByID(id string) (models.Project, error) {

	var project models.Project

	err := database.DB.First(&project, id).Error

	return project, err
}

func UpdateProject(project *models.Project) error {
	return database.DB.Save(project).Error
}

func DeleteProject(project *models.Project) error {
	return database.DB.Delete(project).Error
}
