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

func UpdateProject(Project *models.Project, updatedBy uint) error {
	err := repositories.UpdateProject(Project)
	if err != nil {
		return err
	}

	LogActivity("UPDATED", "PROJECT", Project.ID, updatedBy, "Project details updated")
	return nil
}

func DeleteProject(Project *models.Project, deletedBy uint) error {
	err := repositories.DeleteProject(Project)
	if err != nil {
		return err
	}

	LogActivity("DELETED", "PROJECT", Project.ID, deletedBy, "Project was deleted")
	return nil
}
