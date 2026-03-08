package models

type Post struct {
	BaseModel

	ProductID   uint
	Product     Product
	ProductImg  string
	Price       float64
	TotalQty    int
	TotalOrders int
}
