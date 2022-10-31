require(tidyverse)
require(dplyr)
require(ggplot2)
require(lubridate)
require(sf)
require(leaflet)
require(shiny)
require(plotly)

# load data ---------------------------------------------------------------

# google mobility data
data <- read.csv("Global_Mobility_Report.csv")

# covid cases jhu
covid <- read.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv")

# london borough employment
jobs <- read.csv("borough_employment.csv") %>%
  rename(count = X2020)

# greater london boroughs gis data
lon_gis <- read_sf("lon-boroughs/lon-boroughs.shp")

# renaming boroughs file
# names in gis file and google file differ
rename_dict <- read.csv("lon_rename.csv")

# process data --------------------------------------------------------
lon_gis <- lon_gis %>%
  sf::st_transform('+proj=longlat +datum=WGS84') %>%
  select(-c(GSS_CODE, HECTARES, NONLD_AREA, ONS_INNER, SUB_2009, SUB_2006)) %>%
  rename(borough=NAME)

rename_dict <- rename_dict %>%
  mutate(across(where(is.character), trimws))

# region by category ------------------------------------------------------

country <- data %>%
  filter(country_region == "United Kingdom") %>%
  filter(sub_region_1 == "Greater London") %>%
  filter(sub_region_2 == "London Borough of Islington" | 
           sub_region_2 == "London Borough of Tower Hamlets" |
           sub_region_2 == "London Borough of Ealing" |
           sub_region_2 == "London Borough of Bexley" |
           sub_region_2 == "London Borough of Lambeth") %>%
  mutate(date = as.Date(date)) %>%
  select(-c(grocery_and_pharmacy_percent_change_from_baseline,
            parks_percent_change_from_baseline,
            retail_and_recreation_percent_change_from_baseline, 
            workplaces_percent_change_from_baseline,
            residential_percent_change_from_baseline))

region <- country %>%
#  filter(census_fips_code == "25001") %>%
  pivot_longer(cols = contains("percent_change"), names_to = "category", values_to = "percent_change") %>%
  mutate(month = format(date,'%m-%Y')) %>%
  mutate(year = year(date)) %>%
  mutate(md = format(date, "%m-%d")) %>%
  mutate(week = format(date, "%V")) %>%
  mutate(category = str_split(category, "_percent", simplify = TRUE)[ , 1]) %>%
  group_by(sub_region_2, week, year, category) %>%
  summarise(pct_ch = mean(percent_change))

raw_chart <- ggplot(
  region, 
  aes(x = week, 
      y = pct_ch, 
      colour = as.factor(sub_region_2), 
      group = as.factor(sub_region_2))) +  
  geom_line() + 
 # coord_polar() +
  facet_grid(rows = vars(year)) + 
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1))

raw_chart

# diff yr to yr -----------------------------------------------------------
df <- data %>%
  select(-c(grocery_and_pharmacy_percent_change_from_baseline, 
            residential_percent_change_from_baseline,
            parks_percent_change_from_baseline)) %>%
  filter(iso_3166_2_code == "US-MA") %>%
  mutate(date = as.Date(date)) %>%
  mutate(year = year(date)) %>%
  mutate(week = format(date, "%V")) %>%
  pivot_longer(cols = contains("percent_change"), names_to = "category", values_to = "percent_change") %>%
  mutate(category = str_split(category, "_percent", simplify = TRUE)[ , 1]) %>%
  select(c(sub_region_1, date, year, week, category, percent_change)) %>%
  arrange(year, category, date)

df <- df %>%
  group_by(week, year, category) %>%
  summarise(pct_ch = mean(percent_change)) %>%
  pivot_wider(names_from = year, values_from = pct_ch, names_prefix = "yr_") %>%
  mutate(diff_20_to_21 = yr_2021 - yr_2020) %>%
  mutate(diff_20_to_22 = yr_2022 - yr_2020) %>%
  mutate(diff_21_to_22 = yr_2022 - yr_2021) %>%
  select(c(week, category, diff_20_to_21, diff_20_to_22, diff_21_to_22)) %>%
  pivot_longer(cols = contains("diff"), names_to = "yr_diff", values_to = "diff")

diff_chart <- ggplot(
  df, 
  aes(x = week, 
      y = diff, 
      colour = as.factor(yr_diff), 
      group = as.factor(yr_diff))) +  
  geom_line() + 
  # coord_polar() +
  facet_grid(rows = vars(category)) + 
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1))

diff_chart

# uk ----------------------------------------------------------------------

lon <- data %>%
  filter(country_region == "United Kingdom") %>%
  filter(sub_region_1 == "Greater London") %>%
  filter(sub_region_2 == "") %>%
  left_join(rename_dict, by=c("sub_region_2" = "Google")) %>%
  rename(borough = GIS) %>%
  select(c(borough, date, contains("percent")))

lon <- lon %>%
  pivot_longer(cols = contains("percent_change"), names_to = "category", values_to = "percent_change") %>%
  mutate(category = str_split(category, "_percent", simplify = TRUE)[ , 1]) %>%
  mutate(date = as.Date(date)) %>%
  mutate(year = format(date, "%y")) %>%
  mutate(week = floor_date(as.Date(date, "%m/%d/%Y"), unit="week")) %>%
  group_by(borough, week, year, category) %>%
  summarise(percent_change = mean(percent_change, na.rm = T))

df <- lon_gis %>%
  right_join(lon, by="borough")

work <- lon %>%
  filter(category == "workplaces") %>%
  filter(!is.na(percent_change)) 
#%>% filter(borough == "Harrow" | borough == "City of London")

work_chart <- ggplot(
  work, 
  aes(x = week, 
      y = percent_change,
      colour = as.factor(borough), 
      group = as.factor(borough),
      text = paste(work$borough))) +  
  geom_line()


work_chart

# jobs ------------------------------------------------------------------
tot_count_jobs <- jobs %>%
  group_by(Borough) %>%
  summarise(total = sum(count))

jobs <- jobs %>%
  left_join(tot_count_jobs, by = "Borough") %>%
  mutate(pct = count / total)

max_job <- jobs %>%
  group_by(Borough) %>%
  top_n(1, pct)

# jhu ---------------------------------------------------------------------
covid <- covid %>%
  pivot_longer(cols = contains("X"), names_to = "date", values_to = "cases") %>%
  

