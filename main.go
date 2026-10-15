package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()
	err := wails.Run(&options.App{
		Title:            "MeiliPilot",
		Width:            1280,
		Height:           800,
		MinWidth:         960,
		MinHeight:        640,
		DisableResize:    false,
		AssetServer:      &assetserver.Options{Assets: assets},
		BackgroundColour: &options.RGBA{R: 250, G: 250, B: 250, A: 255},
		OnStartup:        app.startup,
		Bind:             []interface{}{app},
		Windows:          &windows.Options{WebviewIsTransparent: false},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
