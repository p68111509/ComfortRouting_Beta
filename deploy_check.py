#!/usr/bin/env python3
"""
部署前檢查腳本
檢查所有必要的文件是否存在，路徑配置是否正確
"""

import os
import sys
from pathlib import Path

def check_file_exists(file_path, description):
    """檢查文件是否存在"""
    if os.path.exists(file_path):
        print(f"✅ {description}: {file_path}")
        return True
    else:
        print(f"❌ {description}: {file_path} (缺失)")
        return False

def check_deployment_files():
    """檢查部署相關文件"""
    print("🔍 檢查部署文件...")
    
    required_files = [
        ("index.html", "前端頁面"),
        ("app.js", "前端JavaScript"),
        ("styles.css", "前端樣式"),
        ("api/main.py", "後端API"),
        ("api/requirements.txt", "Python依賴"),
        ("requirements.txt", "根目錄Python依賴"),
        ("render.yaml", "Render部署配置"),
        ("Procfile", "Heroku兼容配置"),
        ("data/雙北基隆路網_濃度與暴露_最大連通版.pkl", "路網數據"),
        ("vendor/leaflet/leaflet.css", "Leaflet CSS"),
        ("vendor/leaflet/leaflet.js", "Leaflet JS"),
        ("logo/系統logo_橫版.png", "系統Logo"),
    ]
    
    all_exist = True
    for file_path, description in required_files:
        if not check_file_exists(file_path, description):
            all_exist = False
    
    return all_exist

def check_path_configuration():
    """檢查路徑配置"""
    print("\n🔍 檢查路徑配置...")
    
    # 檢查HTML中的路徑
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            content = f.read()
            
        required_paths = [
            "/static/styles.css",
            "/static/app.js", 
            "/static/vendor/leaflet/leaflet.css",
            "/static/vendor/leaflet/leaflet.js",
            "/static/logo/系統logo_橫版.png"
        ]
        
        for path in required_paths:
            if path in content:
                print(f"✅ HTML包含正確路徑: {path}")
            else:
                print(f"❌ HTML缺少路徑: {path}")
                
    except Exception as e:
        print(f"❌ 無法讀取index.html: {e}")
        return False
    
    return True

def check_api_configuration():
    """檢查API配置"""
    print("\n🔍 檢查API配置...")
    
    try:
        with open("api/main.py", "r", encoding="utf-8") as f:
            content = f.read()
            
        if "StaticFiles" in content:
            print("✅ 靜態文件配置存在")
        else:
            print("❌ 靜態文件配置缺失")
            
        if "/static" in content:
            print("✅ 靜態文件路徑配置正確")
        else:
            print("❌ 靜態文件路徑配置錯誤")
            
    except Exception as e:
        print(f"❌ 無法讀取api/main.py: {e}")
        return False
    
    return True

def main():
    """主函數"""
    print("🚀 ComfortRouting Beta 部署前檢查")
    print("=" * 50)
    
    # 檢查文件
    files_ok = check_deployment_files()
    
    # 檢查路徑配置
    paths_ok = check_path_configuration()
    
    # 檢查API配置
    api_ok = check_api_configuration()
    
    print("\n" + "=" * 50)
    if files_ok and paths_ok and api_ok:
        print("🎉 所有檢查通過！可以進行部署。")
        return 0
    else:
        print("⚠️  發現問題，請修復後再部署。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
