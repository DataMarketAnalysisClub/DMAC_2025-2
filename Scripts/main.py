import data_loader as dl
import data_cleaning as dc
import data_new_features as dnf
#import matplotlib.pyplot as plt

ipsa_list = [
    "AGUAS-A.SN",
    "ANDINA-B.SN",
    "BCI.SN",
    "BSANTANDER.SN",
    "CAP.SN",
    "CCU.SN",
    "CENCOMALLS.SN",
    "CENCOSUD.SN",
    "CHILE.SN",
    "CMPC.SN",
    "COLBUN.SN",
    "CONCHATORO.SN",
    "COPEC.SN",
    "ECL.SN",
    "ENELAM.SN",
    "ENELCHILE.SN",
    "ENTEL.SN",
    "FALABELLA.SN",
    "IAM.SN",
    "ITAUCL.SN",
    "LTM.SN",
    "MALLPLAZA.SN",
    "PARAUCO.SN",
    "RIPLEY.SN",
    "SECURITY.SN",
    "SMU.SN",
    "SONDA.SN",
    "SQM-B.SN",
    "VAPORES.SN"
]

start_date = '2025-01-01'
end_date = '2025-11-18'

index_data = dnf.get_index_data(ipsa_list, start_date, end_date)

# Exportamos a CSV

# Creamos el INDEX IPSA ajustado
ipsa_index, mc_matrix, weights = dnf.build_ipsa_index(index_data, base_value=1000.0)

ipsa_index.to_csv('ipsa_index.csv')

print(ipsa_index.tail())
print(weights.tail())