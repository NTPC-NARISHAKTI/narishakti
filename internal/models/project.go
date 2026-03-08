package models

type Project struct {
	BaseModel

	Name    string `gorm:"size:255;not null"`
	Address string `gorm:"type:text"`
}
