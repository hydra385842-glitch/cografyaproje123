import streamlit as st
import streamlit.components.v1 as components
import os

# ───── PAGE CONFIG ─────
st.set_page_config(
    page_title="Cografya Similasyon Motoru -Mehmet Sencer 9-A 330",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ───── HIDE STREAMLIT HEADER/FOOTER ─────
st.markdown("""
    <style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .block-container {padding: 0rem;}
    iframe {border-radius: 0px;}
    </style>
    """, unsafe_allow_html=True)

# ───── LOAD ASSETS ─────
def load_html():
    with open("simulation.html", "r", encoding="utf-8") as f:
        html = f.read()
    
    with open("similation.js", "r", encoding="utf-8") as f:
        js = f.read()
    
    # Inline the JS content
    # Replace <script src="similation.js"></script> with the actual code
    full_html = html.replace('<script src="similation.js"></script>', f'<script>{js}</script>')
    return full_html

# ───── MAIN APP ─────
try:
    html_content = load_html()
    # Use a large height to ensure the simulation UI fits well
    components.html(html_content, height=950, scrolling=True)
except Exception as e:
    st.error(f"Simülasyon yüklenirken hata oluştu: {e}")
    st.info("Lütfen 'simulation.html' ve 'similation.js' dosyalarının mevcut olduğundan emin olun.")
