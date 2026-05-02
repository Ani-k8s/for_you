FROM nginx:stable-alpine

# Remove default configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy our configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
