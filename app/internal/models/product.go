package models

type Product struct {
	BaseModel

	Name        string `gorm:"size:255;not null"`
	Description string `gorm:"type:text"`

	ProjectID uint
	Project   Project
}
