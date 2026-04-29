package models

type Product struct {
	BaseModel

	Name        string `gorm:"size:255;not null"`
	Description string `gorm:"type:text"`
	Category    string `gorm:"size:100;index"`

	ProjectID uint
	Project   Project
}
