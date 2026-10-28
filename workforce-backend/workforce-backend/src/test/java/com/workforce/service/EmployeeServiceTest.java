
package com.workforce.service;

import com.workforce.entity.Employee;
import com.workforce.repository.EmployeeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private EmployeeService employeeService;

    @Test
    void createEmployeeShouldReturnSavedEmployee() {
        Employee employee = new Employee(
                "Ajit",
                "Shinde",
                "ajit@example.com",
                "Engineering",
                65000.0
        );

        when(employeeRepository.save(employee))
                .thenReturn(employee);

        Employee result =
                employeeService.createEmployee(employee);

        assertNotNull(result);
        assertEquals("Ajit", result.getFirstName());
        assertEquals("ajit@example.com", result.getEmail());

        verify(employeeRepository).save(employee);
    }

    @Test
    void getAllEmployeesShouldReturnEmployeeList() {
        List<Employee> employees = List.of(
                new Employee(
                        "Ajit", "Shinde",
                        "ajit@example.com",
                        "Engineering", 65000.0
                ),
                new Employee(
                        "Rahul", "Patil",
                        "rahul@example.com",
                        "HR", 55000.0
                )
        );

        when(employeeRepository.findAll())
                .thenReturn(employees);

        List<Employee> result =
                employeeService.getAllEmployees();

        assertEquals(2, result.size());
        assertEquals("Ajit", result.get(0).getFirstName());

        verify(employeeRepository).findAll();
    }
    @Test
    void updateEmployeeShouldUpdateExistingEmployee() {
        Employee existing = new Employee(
                "Ajit", "Shinde", "ajit@example.com",
                "Engineering", 65000.0
        );

        Employee updated = new Employee(
                "Ajit", "Shinde", "ajit@example.com",
                "IT", 75000.0
        );

        when(employeeRepository.findById(1L))
                .thenReturn(Optional.of(existing));
        when(employeeRepository.save(existing))
                .thenReturn(existing);

        Employee result = employeeService.updateEmployee(1L, updated);

        assertEquals("IT", result.getDepartment());
        assertEquals(75000.0, result.getSalary());
        verify(employeeRepository).save(existing);
    }
    @Test
    void deleteEmployeeShouldDeleteExistingEmployee() {
        when(employeeRepository.existsById(1L)).thenReturn(true);

        employeeService.deleteEmployee(1L);

        verify(employeeRepository).deleteById(1L);
    }
}
