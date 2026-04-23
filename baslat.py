import webbrowser, os

dosya = os.path.join(os.path.dirname(os.path.abspath(__file__)), "simulation.html")
print(f"🌍 Coğrafya Simülasyonu açılıyor: {dosya}")
webbrowser.open(f"file:///{dosya}")
print("✅ Tarayıcıda açıldı!")
