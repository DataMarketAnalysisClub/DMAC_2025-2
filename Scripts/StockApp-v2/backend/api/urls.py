from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health, name='health'),
    path('market-data/', views.market_data, name='market-data'),
    path('forecast/', views.forecast, name='forecast'),
    path('optimize/', views.optimize, name='optimize'),
]
