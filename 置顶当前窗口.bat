@echo off
chcp 65001 >nul
title Spotify 控制器 - 系统级窗口置顶
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0pin_window.ps1"
