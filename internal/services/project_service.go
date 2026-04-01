package services

import (
	"marketplace/internal/models"
	"marketplace/internal/repositories"
)

func CreateProject(Project *models.Project, createdBy uint) error {
	err := repositories.CreateProject(Project)
	if err != nil {
		return err
	}

	// Log the project creation
	LogActivity("CREATED", "PROJECT", Project.ID, createdBy, "Project was created")

	return nil
}

func GetProjects() ([]models.Project, error) {
	return repositories.GetProjects()
}

func GetProject(id string) (models.Project, error) {
	return repositories.GetProjectByID(id)
}

func UpdateProject(Project *models.Project) error {
	return repositories.UpdateProject(Project)
}

func DeleteProject(Project *models.Project) error {
	return repositories.DeleteProject(Project)
}
