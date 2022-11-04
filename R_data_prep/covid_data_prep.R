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
mobility_df <- read.csv("~/Documents/School/Resume/2022_08/economist/Global_Mobility_Report.csv")

# covid cases jhu
covid_df <- read.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv")

# dates of US state stay-at-home orders
sah_dates <- read.csv("state_stay-at-home_orders.csv")

# state codes
state_abbr <- read.csv("state_abbr.csv")

# constants ---------------------------------------------------------------

# export variables
export_path = "~/Documents/School/Resume/2022_08/economist/covid_mobility_trends/csv_files/"
us_export_path = paste(export_path, "us_ntl_data.csv", sep="")
state_export_path = paste(export_path, "state_data.csv", sep="")

# functions ---------------------------------------------------------------
find_week <- function(date_of_interest, week_start_day) {
  d <- as.Date(date_of_interest)
  s <- week_start_day - 1
  w <- floor_date(d, unit="week", week_start = s)
  return(as.Date(w))
}

find_week_V <- Vectorize(find_week)

# data processing ---------------------------------------------------------
########## STATE ABBREVIATION CODES ########## 
state_abbr <- state_abbr %>%
  select(-Abbrev)

########## STAY AT HOME START DATE DATA ########## 
sah_dates <- sah_dates %>%
  mutate(date = as.Date(date)) %>%
  rename("sah_start_date" = "date") %>%
  mutate(sah_day_of_week = case_when(
    is.na(sah_start_date) ~ 1,
    TRUE ~ wday(sah_start_date)
  ))

########## MOBILITY DATA ##########
df <- mobility_df %>%
  select(-c(grocery_and_pharmacy_percent_change_from_baseline, 
            residential_percent_change_from_baseline,
            parks_percent_change_from_baseline)) %>%
  filter(country_region == "United States") %>%
  filter(sub_region_2 == "") %>% # state or national data (exclude county data)
  mutate(date_full = as.Date(date)) %>%
  mutate(year = year(date_full)) %>%
  select(-date) %>%
  mutate(sub_region_1 = ifelse(sub_region_1 == "", "US", sub_region_1)) %>%
  rename("region" = "sub_region_1")

# join with stay at home order dates
df <- df %>%
  left_join(sah_dates, by = c("region" = "state")) %>%
  mutate(sah_start_date = as.Date(sah_start_date)) %>%
  mutate(sah_day_of_week = 
           case_when(
             is.na(sah_start_date) ~ 1,
             TRUE ~ sah_day_of_week
           )) %>%
  ungroup() %>%
  # use the day of the week that the stay-at-home order began as week_start (ie if stay-at-home order began on a Saturday the weeks will be grouped as Sat->Fri)
  # classification of weeks will differ between states because the stay-at-home orders
  # started on different days of the week
  mutate(week_start_date = find_week_V(date_full, sah_day_of_week)) %>%
  mutate(week_start_date = as.Date(week_start_date, origin = "1970-01-01"))

df <- df %>%
  select(region, date_full, year, sah_start_date, sah_day_of_week, week_start_date, contains("percent_change")) %>%
  pivot_longer(cols = contains("percent_change"), names_to = "category", values_to = "percent_change") %>%
  group_by(region, week_start_date, year) %>%
  # find average percent change over week period
  summarise(percent_change = mean(percent_change, na.rm = T)) %>%
  ungroup() %>%
  arrange(region, week_start_date) %>%
  group_by(region) %>%
  # percent difference week to week
  mutate(percent_diff = percent_change - lag(percent_change))

df_day_max_mobility_diff <- df %>%
  filter(week_start_date < as.Date("2020-04-30")) %>%
  group_by(region) %>%
  slice_min(order_by = percent_diff) %>%
  select(region, week_start_date) %>%
  rename("week_biggest_change_mobility" = "week_start_date")

df <- df %>% 
  left_join(df_day_max_mobility_diff, by = "region")

########## COVID DATA ##########
covid_df <- covid_df %>%
  pivot_longer(cols = contains("X"), names_to = "date", values_to = "cases") %>%
  mutate(full_date = sub(".*X", "", date)) %>%
  mutate(full_date = mdy(full_date)) %>%
  select(Province_State, full_date, cases) %>%
  group_by(Province_State, full_date) %>%
  # aggregate from county -> state
  summarise(tot_cases = sum(cases)) %>%
  rename("region" = "Province_State")

# sum cases for entire US (data only gives it by state)
tot_us_cases <- covid_df %>%
  ungroup() %>%
  group_by(full_date) %>%
  summarise(tot_cases = sum(tot_cases)) %>%
  mutate(region = "US")

# union state and federal data
covid_df <- union(covid_df, tot_us_cases)

# calculate new cases (data is cumulative cases)
covid_df <- covid_df %>%
  ungroup() %>%
  group_by(region) %>%
  mutate(new_cases = tot_cases - lag(tot_cases))

covid_df <- covid_df %>%
  left_join(sah_dates, by = c("region" = "state")) %>%
  mutate(sah_start_date = as.Date(sah_start_date)) %>%
  mutate(sah_day_of_week = 
           case_when(
             is.na(sah_start_date) ~ 1,
             TRUE ~ sah_day_of_week
           )) %>%
  ungroup() %>%
  # again creating the weeks based on when the stay-at-home order started
  mutate(week_start_date = find_week_V(full_date, sah_day_of_week)) %>%
  mutate(week_start_date = as.Date(week_start_date, origin = "1970-01-01"))

covid_df <- covid_df %>%
  ungroup() %>%
  group_by(region, week_start_date) %>%
  # find average percent change over week period
  summarise(weekly_avg_new_cases = round(mean(new_cases, na.rm = T), 1))

########## JOIN DATA ##########
df <- df %>%
  left_join(covid_df, by = c("region", "week_start_date")) %>%
  left_join(sah_dates, by = c("region" = "state")) %>%
  mutate(mobility_lockdown_lag_wk = as.numeric(difftime(sah_start_date, week_biggest_change_mobility, units="week")))

########## PREPARE DF FOR EXPORT ##########
# CSV 1 = covid cases and mobility by week for US nationally
us_df <- df %>%
  filter(region == "US") %>%
  mutate(month = format(week_start_date, "%b %Y"))

# CSV 2 = date of largest decline in mobility -> sah start date with covid and mobility data BY STATE
state_data <- df %>%
  filter(week_start_date <= sah_start_date &
           week_start_date >= week_biggest_change_mobility) %>%
  select(region, week_start_date, percent_change, percent_diff, weekly_avg_new_cases, mobility_lockdown_lag_wk)

state_start_data <- state_data %>%
  group_by(region) %>%
  top_n(-1, week_start_date) %>%
  select(-mobility_lockdown_lag_wk)

state_sah_data <- state_data %>%
  group_by(region) %>%
  top_n(1, week_start_date) %>%
  rename_with(.cols = c(week_start_date, percent_change, percent_diff, weekly_avg_new_cases), 
              .fn = ~ paste0("sah_", .x)) 

state_df <- state_start_data %>%
  left_join(state_sah_data, by = "region") %>%
  left_join(state_abbr, by = c("region" = "State"))


# EXPORT ------------------------------------------------------------------
write_csv(us_df, us_export_path)
write_csv(state_df, state_export_path)


df1 <- state_df %>%
  mutate(log_covid = log(sah_weekly_avg_new_cases, 10))
